import { Color, Zone, ActivityData } from './types';

const hrZones =
  'https://connect.garmin.com/modern/proxy/biometric-service/heartRateZones/*';
const activity =
  'https://connect.garmin.com/modern/proxy/activity-service/activity/*/details?*';
const strydZonesDataFieldID = '18fb2cf0-1a4b-430d-ad66-988c847421f4';
const activityData: ActivityData = {};

function activityDataSniffer(
  details: browser.webRequest._OnBeforeRequestDetails,
) {
  const filter = browser.webRequest.filterResponseData(details.requestId);
  const decoder = new TextDecoder('utf-8');

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

    const { activityId, metricDescriptors, activityDetailMetrics } = JSON.parse(
      str,
    );
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
    const { metricsIndex: powerIndex } = powerMetric;
    const { metricsIndex: secsIndex } = secsElapsedMetric;
    const heartRate = activityDetailMetrics.map(({ metrics }) => [
      metrics[secsIndex],
      metrics[hrIndex],
    ]);
    const power = activityDetailMetrics.map(({ metrics }) => [
      metrics[secsIndex],
      metrics[powerIndex],
    ]);
    activityData[activityId] = { heartRate, power };
    filter.close();
  };

  return {};
}

const dataSniffer = <T>(cb: (d: T) => void) => (
  details: browser.webRequest._OnBeforeRequestDetails,
) => {
  const filter: any = browser.webRequest.filterResponseData(details.requestId);
  const decoder = new TextDecoder('utf-8');

  const data: any[] = [];
  filter.ondata = (event: any) => {
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

    cb(JSON.parse(str));
    filter.close();
  };

  return {};
};

browser.webRequest.onBeforeRequest.addListener(
  dataSniffer(d => console.log(d)),
  { urls: [hrZones] },
  ['blocking'],
);
browser.webRequest.onBeforeRequest.addListener(
  activityDataSniffer,
  { urls: [activity] },
  ['blocking'],
);

function handleMessage(
  { id }: { id: string },
  _: browser.runtime.MessageSender,
  sendResponse: (response?: any) => void,
) {
  console.log('REQUESTED ACTIVITY: ', id);
  const int = setInterval(() => {
    if (id in activityData) {
      console.log('ENTRY FOUND!');
      const { power, heartRate } = activityData[id];
      sendResponse({ heartRate, power });
      clearInterval(int);
    } else {
      console.log('DATA NOT READY');
    }
  }, 100);
  return true;
}

browser.runtime.onMessage.addListener(handleMessage);
