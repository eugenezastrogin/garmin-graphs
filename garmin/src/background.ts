import {
  APIActivity,
  APIActivityMeta,
  APIUserMeta,
  ActivityData,
  Filter,
  TabData,
} from './types';

const hrZones =
  'https://connect.garmin.com/modern/proxy/biometric-service/heartRateZones/*';
const activity =
  'https://connect.garmin.com/modern/proxy/activity-service/activity/*';
const userMeta =
  'https://connect.garmin.com/modern/proxy/userprofile-service/userprofile/user-settings/*';
const strydZonesDataFieldID = '18fb2cf0-1a4b-430d-ad66-988c847421f4';
const filter = {
  url: [{ hostContains: 'connect.garmin.com' }],
};
const activityData: ActivityData = {};
const tabData: TabData = {};
const activityIDsOfOtherUsers = new Set<number>();
let currentUserID: null | number = null;

const dataSniffer = (cb: (d: string, url?: string) => void) => (
  details: browser.webRequest._OnBeforeRequestDetails,
) => {
  const filter = browser.webRequest.filterResponseData(
    details.requestId,
  ) as Filter;
  const decoder = new TextDecoder('utf-8');

  const data: ArrayBuffer[] = [];
  filter.ondata = (event: { data: ArrayBuffer }) => {
    data.push(event.data);
    filter.write(event.data);
  };

  filter.onstop = () => {
    let str = '';
    if (data.length == 1) {
      str = decoder.decode(data[0]);
    } else {
      for (let i = 0; i < data.length; i++) {
        const stream = i == data.length - 1 ? false : true;
        str += decoder.decode(data[i], { stream });
      }
    }
    filter.close();
    cb(str, details.url);
  };

  return {};
};

function activityRouter(data: string, url: string | undefined) {
  if (!url) {
    console.log('NO URL IN REQUEST HEADER!');
    return;
  }
  if (url.match(/\/activity\/\d+\?_=\d+/)) {
    handleActivityMeta(data);
  } else if (url.match(/\/activity\/\d+\/details/)) {
    handleActivityDetails(data);
  }
}

function handleActivityMeta(data: string) {
  try {
    const { activityId, userProfileId } = JSON.parse(data) as APIActivityMeta;
    if (currentUserID && userProfileId !== currentUserID) {
      console.log(
        `Marking activity: ${activityId} as belonging to user: ${userProfileId}`,
      );
      activityIDsOfOtherUsers.add(activityId);
    } else {
      console.log(`Marking own activity: ${activityId}`);
    }
  } catch (e) {
    console.log(`Error: ${e} when processing ${data} as activity meta`);
  }
}

function userMetaCallback(data: string) {
  try {
    const { id } = JSON.parse(data) as APIUserMeta;
    if (id !== currentUserID) {
      currentUserID = id;
      console.log(`USER ID changed: ${id}`);
      browser.storage.sync.set({
        userID: id,
      });
    }
  } catch (e) {
    console.log(`Error: ${e} when processing: ${data} as user meta`);
  }
}

function handleActivityDetails(data: string) {
  try {
    console.log('ACTIVITY SNIFFED');
    const {
      activityId: _activityId,
      metricDescriptors,
      activityDetailMetrics,
    } = JSON.parse(data) as APIActivity;
    const activityId = String(_activityId);
    if (activityIDsOfOtherUsers.has(_activityId)) {
      console.log('SKIPPING ACTIVITY PROCESSING OF OTHER USER');
      return;
    }
    const powerMetric = metricDescriptors.find(
      ({ appID }) => appID && appID === strydZonesDataFieldID,
    );
    const hrMetric = metricDescriptors.find(
      ({ key }) => key === 'directHeartRate',
    );
    const secsElapsedMetric = metricDescriptors.find(
      ({ key }) => key === 'sumElapsedDuration',
    );
    if (!hrMetric || !secsElapsedMetric) {
      console.log('no HR!');
      return;
    }
    const { metricsIndex: hrIndex } = hrMetric;
    const { metricsIndex: secsIndex } = secsElapsedMetric;
    const heartRate: [
      number,
      number,
    ][] = activityDetailMetrics.map(({ metrics }) => [
      metrics[secsIndex],
      metrics[hrIndex],
    ]);
    if (!powerMetric) {
      activityData[activityId] = { heartRate };
    } else {
      const { metricsIndex: powerIndex } = powerMetric;
      const power: [
        number,
        number,
      ][] = activityDetailMetrics.map(({ metrics }) => [
        metrics[secsIndex],
        metrics[powerIndex],
      ]);
      activityData[activityId] = { heartRate, power };
    }
    // Broadcast activity data to all relevant tabs
    Object.entries(tabData)
      .filter(([_, { activity }]) => activity && activity === activityId)
      .forEach(([tabID, { port }]) => {
        try {
          port.postMessage(activityData[activityId]);
        } catch (e) {
          console.log(
            `Error when sending activity entry, force flush stale data for tab ${tabID}!`,
          );
          delete tabData[Number(tabID)];
        }
      });
  } catch (e) {
    console.log(`Error: ${e} when processing: ${data} as activity details`);
  }
}

function getActivityID(url: string): string | null {
  const extractedID = url.match(/\/activity\/(\d+)/)?.[1];
  if (!extractedID) return null;
  return extractedID;
}

function handleNewConnection(port: browser.runtime.Port) {
  console.log('Establishing connection');
  if (!port.sender || !port.sender.tab || !port.sender.tab.id) return;
  const tabID = port.sender.tab.id;
  tabData[tabID] = { port, activity: null };

  const { url, tab } = port.sender;
  if (!url || !tab) return;

  port.onMessage.addListener(function (msg: { unload?: boolean }) {
    if ('unload' in msg && msg.unload) {
      console.log(`Tab ${tabID} was unloaded and removed`);
      delete tabData[tabID];
    }
  });

  const maybeActivity = getActivityID(url);
  if (!maybeActivity || !tab || !tab.id) {
    console.log('Garmin page found, non-activity page');
    return;
  }
  console.log(`ACTIVITY ${maybeActivity} found in CONNECTION tab ${tab.id}`);
  tabData[tab.id].activity = maybeActivity;
}

function init() {
  browser.storage.local.get('userID').then(res => {
    if ('userID' in res) {
      currentUserID = res.userID;
    }
  });
  browser.webRequest.onBeforeRequest.addListener(
    dataSniffer(d => console.log(d)),
    { urls: [hrZones] },
    ['blocking'],
  );
  browser.webRequest.onBeforeRequest.addListener(
    dataSniffer(userMetaCallback),
    { urls: [userMeta] },
    ['blocking'],
  );
  browser.webRequest.onBeforeRequest.addListener(
    dataSniffer(activityRouter),
    { urls: [activity] },
    ['blocking'],
  );
  browser.runtime.onConnect.addListener(handleNewConnection);

  browser.webNavigation.onHistoryStateUpdated.addListener(({ tabId, url }) => {
    const maybeActivity = getActivityID(url);
    if (!maybeActivity) return;
    console.log(`ACTIVITY ${maybeActivity} found in tab ${tabId}`);
    tabData[tabId].activity = maybeActivity;
  }, filter);
}

init();
