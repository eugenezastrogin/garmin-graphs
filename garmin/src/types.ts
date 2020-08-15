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
};

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
