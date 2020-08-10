const hrZones =
  'https://connect.garmin.com/modern/proxy/biometric-service/heartRateZones/*';
const activity =
  'https://connect.garmin.com/modern/proxy/activity-service/activity/*/details?*';
let hrDataGlobal;
let activityDataGlobal;

function heartRateDataSniffer(details) {
  let filter = browser.webRequest.filterResponseData(details.requestId);
  let decoder = new TextDecoder('utf-8');

  filter.ondata = event => {
    const str = decoder.decode(event.data, { stream: true });
    const {
      zone1Floor,
      zone2Floor,
      zone3Floor,
      zone4Floor,
      zone5Floor,
      maxHeartRateUsed,
    } = JSON.parse(str)[0];
    console.log('MAX HR:', maxHeartRateUsed);
    filter.write(event.data);
    filter.disconnect();
  };

  return {};
}
function activityDataSniffer(details) {
  let filter = browser.webRequest.filterResponseData(details.requestId);
  let decoder = new TextDecoder('utf-8');

  let data = [];
  filter.ondata = event => {
    data.push(event.data);
    filter.write(event.data);
  };

  filter.onstop = () => {
    let str = '';
    if (data.length == 1) {
      str = decoder.decode(data[0]);
    } else {
      for (let i = 0; i < data.length; i++) {
        let stream = i == data.length - 1 ? false : true;
        str += decoder.decode(data[i], { stream });
      }
    }
    const { metricDescriptors, activityDetailMetrics } = JSON.parse(str);
    const hrMetric = metricDescriptors.find(
      ({ key }) => key === 'directHeartRate',
    );
    const secsElapsedMetric = metricDescriptors.find(
      ({ key }) => key === 'sumElapsedDuration',
    );
    if (!hrMetric || !secsElapsedMetric) throw new Error('no HR!');
    const { metricsIndex: hrIndex } = hrMetric;
    const { metricsIndex: secsIndex } = secsElapsedMetric;
    const hrData = activityDetailMetrics.map(({ metrics }) => [
      metrics[secsIndex],
      metrics[hrIndex],
    ]);
    console.log(hrData);
    activityDataGlobal = hrData;
    filter.close();
  };

  return {};
}

browser.webRequest.onBeforeRequest.addListener(
  heartRateDataSniffer,
  { urls: [hrZones] },
  ['blocking'],
);
browser.webRequest.onBeforeRequest.addListener(
  activityDataSniffer,
  { urls: [activity] },
  ['blocking'],
);
console.log('BACKGROUND');

function handleMessage(request, sender, sendResponse) {
  console.log('Message from the content script: ' + request.greeting);
  sendResponse({
    response: 'Response from background script',
    data: activityDataGlobal,
  });
}

browser.runtime.onMessage.addListener(handleMessage);
