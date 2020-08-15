import { APIActivity, ActivityData, Filter, TabData } from './types';

const hrZones =
  'https://connect.garmin.com/modern/proxy/biometric-service/heartRateZones/*';
const activity =
  'https://connect.garmin.com/modern/proxy/activity-service/activity/*/details?*';
const strydZonesDataFieldID = '18fb2cf0-1a4b-430d-ad66-988c847421f4';
const filter = {
  url: [{ hostContains: 'connect.garmin.com' }],
};
const activityData: ActivityData = {};
const tabData: TabData = {};

const dataSniffer = (cb: (d: string) => void) => (
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
    cb(str);
  };

  return {};
};

function activityDataCallback(data: string) {
  console.log('ACTIVITY SNIFFED');
  const {
    activityId: _activityId,
    metricDescriptors,
    activityDetailMetrics,
  } = JSON.parse(data) as APIActivity;
  const activityId = String(_activityId);
  const powerMetric = metricDescriptors.find(
    ({ appID }) => appID && appID === strydZonesDataFieldID,
  );
  const hrMetric = metricDescriptors.find(
    ({ key }) => key === 'directHeartRate',
  );
  const secsElapsedMetric = metricDescriptors.find(
    ({ key }) => key === 'sumElapsedDuration',
  );
  if (!hrMetric || !secsElapsedMetric) throw new Error('no HR!');
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
  Object.values(tabData)
    .filter(({ activity }) => activity && activity === activityId)
    .forEach(({ port }) => port.postMessage(activityData[activityId]));
}

browser.webRequest.onBeforeRequest.addListener(
  dataSniffer(d => console.log(d)),
  { urls: [hrZones] },
  ['blocking'],
);
browser.webRequest.onBeforeRequest.addListener(
  dataSniffer(activityDataCallback),
  { urls: [activity] },
  ['blocking'],
);

function getActivityID(url: string): string | null {
  const extractedID = url.match(/\/activity\/(\d+)/)?.[1];
  if (!extractedID) return null;
  return extractedID;
}

function handleNewConnection(port: browser.runtime.Port) {
  console.log('Establishing connection');
  if (!port.sender || !port.sender.tab || !port.sender.tab.id) return;
  tabData[port.sender.tab.id] = { port, activity: null };

  const { url, tab } = port.sender;
  if (!url || !tab) return;
  const maybeActivity = getActivityID(url);
  if (!maybeActivity || !tab || !tab.id) {
    console.log('Garmin page found, non-activity page');
    return;
  }
  console.log(`ACTIVITY ${maybeActivity} found in CONNECTION tab ${tab.id}`);
  tabData[tab.id].activity = maybeActivity;
}

browser.runtime.onConnect.addListener(handleNewConnection);

browser.webNavigation.onHistoryStateUpdated.addListener(({ tabId, url }) => {
  const maybeActivity = getActivityID(url);
  if (!maybeActivity) return;
  console.log(`ACTIVITY ${maybeActivity} found in tab ${tabId}`);
  tabData[tabId].activity = maybeActivity;
}, filter);
