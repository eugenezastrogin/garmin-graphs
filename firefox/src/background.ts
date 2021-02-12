import type {
  APIActivity,
  APIActivityMeta,
  APIUserMeta,
  APIHeartZones,
  ActivityData,
  Filter,
  TabData,
  Zones,
} from './types';

const debug = false;

const hrZones =
  'https://connect.garmin.com/modern/proxy/biometric-service/heartRateZones/*';
const activity =
  'https://connect.garmin.com/modern/proxy/activity-service/activity/*';
const userMeta =
  'https://connect.garmin.com/modern/proxy/userprofile-service/userprofile/user-settings/*';
const strydZonesDataFieldIDs = [
  '18fb2cf0-1a4b-430d-ad66-988c847421f4', // Stryd Zones | Data Field
  '1df63e9d-f886-4541-b188-2406a3bf5be0', // Stryd | Workout App
  '528937a6-1596-499d-8a96-b095480dfda7', //PowerRace | Racing App
];
const filter = {
  url: [{ hostContains: 'connect.garmin.com' }],
};
const activityData: ActivityData = {};
const tabData: TabData = {};
const activityIDsOfOtherUsers = new Set<number>();
const runningActivites = new Set<number>();
let currentUserID: null | number = null;
let overrideRunsOnly = false;

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
function log(...message: any[]) {
  if (debug) {
    console.log(...message);
  }
}
function activityRouter(data: string, url: string | undefined) {
  if (!url) {
    log('NO URL IN REQUEST HEADER!');
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
    const { activityTypeDTO, activityId, userProfileId } = JSON.parse(
      data,
    ) as APIActivityMeta;
    const isRunning = activityTypeDTO.parentTypeId === 1;
    if (currentUserID && userProfileId !== currentUserID) {
      log(
        `Marking activity: ${activityId} as belonging to user: ${userProfileId}`,
      );
      activityIDsOfOtherUsers.add(activityId);
    } else {
      log(`Marking own activity: ${activityId}`);
      if (isRunning) {
        runningActivites.add(activityId);
        log('Marking activity as running');
      }
    }
  } catch (e) {
    log(`Error: ${e} when processing ${data} as activity meta`);
  }
}

function handleHeartZones(data: string) {
  try {
    const zoneData = JSON.parse(data) as APIHeartZones;
    const runningZones = zoneData.find(el => el.sport === 'RUNNING');
    const defaultZones = zoneData.find(el => el.sport === 'DEFAULT');
    const hrZoneData = runningZones ?? defaultZones;
    if (!hrZoneData) {
      log('No valid Zone data!');
      return;
    }
    const {
      zone1Floor,
      zone2Floor,
      zone3Floor,
      zone4Floor,
      zone5Floor,
      maxHeartRateUsed,
    } = hrZoneData;
    const hrZones: Zones = [
      maxHeartRateUsed,
      zone5Floor,
      zone4Floor,
      zone3Floor,
      zone2Floor,
      zone1Floor,
    ];
    browser.storage.sync.set({ hrZones });
    log(`HR Zones Data found: ${hrZones}`);
  } catch (e) {
    log(`Error: ${e} when processing: ${data} as heart zones`);
  }
}

function handleUserMeta(data: string) {
  try {
    const { id } = JSON.parse(data) as APIUserMeta;
    if (id !== currentUserID) {
      currentUserID = id;
      log(`USER ID changed: ${id}`);
      browser.storage.sync.set({
        userID: id,
      });
    }
  } catch (e) {
    log(`Error: ${e} when processing: ${data} as user meta`);
  }
}

function handleActivityDetails(data: string) {
  try {
    log('ACTIVITY SNIFFED');
    const {
      activityId: _activityId,
      metricDescriptors,
      activityDetailMetrics,
    } = JSON.parse(data) as APIActivity;
    const activityId = String(_activityId);
    if (activityIDsOfOtherUsers.has(_activityId)) {
      log('SKIPPING ACTIVITY PROCESSING OF OTHER USER');
      return;
    }
    if (overrideRunsOnly && !runningActivites.has(_activityId)) {
      log('Non-running activity! Skipping...');
      return;
    }
    const powerMetric = metricDescriptors.find(
      ({ appID }) => appID && strydZonesDataFieldIDs.includes(appID),
    );
    const hrMetric = metricDescriptors.find(
      ({ key }) => key === 'directHeartRate',
    );
    const secsElapsedMetric = metricDescriptors.find(
      ({ key }) => key === 'sumMovingDuration',
    );
    if (!hrMetric || !secsElapsedMetric) {
      log('no HR!');
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
          log(`Sending activity data to tab ${tabID}`);
          port.postMessage(activityData[activityId]);
        } catch (e) {
          log(
            `Error when sending activity entry, force flush stale data for tab ${tabID}!`,
          );
          delete tabData[Number(tabID)];
        }
      });
  } catch (e) {
    log(`Error: ${e} when processing: ${data} as activity details`);
  }
}

function getActivityID(url: string): string | null {
  const extractedID = url.match(/\/activity\/(\d+)/)?.[1];
  if (!extractedID) return null;
  return extractedID;
}

function handleNewConnection(port: browser.runtime.Port) {
  log('Establishing connection');
  if (!port.sender || !port.sender.tab || !port.sender.tab.id) return;
  const tabID = port.sender.tab.id;
  tabData[tabID] = { port, activity: null };

  const { url, tab } = port.sender;
  if (!url || !tab) return;

  port.onMessage.addListener(function (msg: { unload?: boolean }) {
    if ('unload' in msg && msg.unload) {
      log(`Tab ${tabID} was unloaded and removed`);
      delete tabData[tabID];
    }
  });

  const maybeActivity = getActivityID(url);
  if (!maybeActivity || !tab || !tab.id) {
    log('Garmin page found, non-activity page');
    return;
  }
  log(`ACTIVITY ${maybeActivity} found in CONNECTION tab ${tab.id}`);
  tabData[tab.id].activity = maybeActivity;
}

function init() {
  browser.storage.sync.get('userID').then(res => {
    if ('userID' in res) {
      currentUserID = res.userID;
    }
  });
  browser.storage.sync.get({ overrideRunsOnly: false }).then(res => {
    overrideRunsOnly = res.overrideRunsOnly;
  });
  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if ('overrideRunsOnly' in changes) {
      const { oldValue, newValue } = changes.overrideRunsOnly as {
        oldValue: boolean;
        newValue: boolean;
      };
      if (oldValue === newValue) return;
      overrideRunsOnly = newValue;
    }
  });
  browser.webRequest.onBeforeRequest.addListener(
    dataSniffer(handleHeartZones),
    { urls: [hrZones] },
    ['blocking'],
  );
  browser.webRequest.onBeforeRequest.addListener(
    dataSniffer(handleUserMeta),
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
    log(`ACTIVITY ${maybeActivity} found in tab ${tabId}`);
    tabData[tabId].activity = maybeActivity;
  }, filter);
}

init();
