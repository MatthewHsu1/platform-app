export type PackagesAfterDonePlan = {
  containerWrites: { id: string; parentPackageId: string | null; packageDestId: null }[];
  notes: { id: string; objectSingular: 'stockPicking' | 'stockPackage'; recordId: string; body: string }[];
  emptyRowKeys: string[];
};
