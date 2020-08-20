export type Color = string;
export type Zone = [number, number];
export type Second = number;
export type Metric = number;
export type Data = [Second, Metric][];
export type ActivityEntry = {
  heartRate: Data;
  power?: Data;
};
export type ActivityID = string;
export type ActivityData = Record<ActivityID, ActivityEntry>;

export type APIActivity = {
  activityId: number;
  metricDescriptors: { appID: string; key: string; metricsIndex: number }[];
  activityDetailMetrics: { metrics: number[] }[];
};
export type APIUserMeta = {
  id: number;
};
export type APIActivityMeta = {
  activityId: number;
  userProfileId: number;
  activityTypeDTO: {
    parentTypeId: number;
    sortOrder: 20;
    typeId: number;
    typeKey: string;
  };
};
export type APIHeartZones = {
  trainingMethod: 'HR_MAX' | 'LACTATE_THRESHOLD' | 'HR_RESERVE';
  sport: 'DEFAULT' | 'RUNNING';
  zone1Floor: number;
  zone2Floor: number;
  zone3Floor: number;
  zone4Floor: number;
  zone5Floor: number;
  maxHeartRateUsed: number;
}[];

export type TabID = number;
export type TabData = Record<
  TabID,
  {
    port: browser.runtime.Port;
    activity: ActivityID | null;
  }
>;

export type Filter = {
  ondata: (e: { data: ArrayBuffer }) => void;
  write: (a: unknown) => void;
  onstop: () => void;
  close: () => void;
};
type Zone_MAX = number;
type Zone5Floor = number;
type Zone4Floor = number;
type Zone3Floor = number;
type Zone2Floor = number;
type Zone1Floor = number;
export type Zones = [
  Zone_MAX,
  Zone5Floor,
  Zone4Floor,
  Zone3Floor,
  Zone2Floor,
  Zone1Floor,
];
