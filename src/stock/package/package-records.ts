import { records } from 'src/shared/triggers/records';

export const stockPackages = records('stockPackage', 'stockPackages');
export const stockPackageHistories = records('stockPackageHistory', 'stockPackageHistories');
export const stockPackageHistoryPickingLinks = records(
  'stockPackageHistoryStockPickingRel',
  'stockPackageHistoryStockPickingRels',
);
