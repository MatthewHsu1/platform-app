type Names = Readonly<Record<string, string>>;

// The display names of the records a merged-away lead links to, by id.
export type MergeSummaryNames = {
  stages: Names;
  teams: Names;
  members: Names;
  plans: Names;
  lostReasons: Names;
  campaigns: Names;
  mediums: Names;
  sources: Names;
};
