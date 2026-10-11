export type PackageHistoryRow = {
  packageId: string;
  packageName: string;
  locationId: string | null;
  locationDestId: string | null;
  parentOrigId: string | null;
  parentOrigName: string | null;
  parentDestId: string | null;
  parentDestName: string | null;
  outermostDestId: string;
  pickingIds: string[];
  moveLineIds: string[];
};
