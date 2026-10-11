import { records } from 'src/shared/triggers/records';

export const stockRoutes = records('stockRoute', 'stockRoutes');
export const stockRules = records('stockRule', 'stockRules');
export const stockPutawayRules = records('stockPutawayRule', 'stockPutawayRules');
export const productRemovals = records('productRemoval', 'productRemovals');
export const stockStorageCategories = records('stockStorageCategory', 'stockStorageCategories');
export const stockStorageCategoryCapacities = records('stockStorageCategoryCapacity', 'stockStorageCategoryCapacities');
export const stockPackageTypes = records('stockPackageType', 'stockPackageTypes');
export const stockRouteProducts = records('stockRouteProduct', 'stockRouteProducts');
export const stockRouteCategs = records('stockRouteCateg', 'stockRouteCategs');
export const stockRouteWarehouses = records('stockRouteWarehouse', 'stockRouteWarehouses');
export const stockPackageTypeStockRouteRels = records('stockPackageTypeStockRouteRel', 'stockPackageTypeStockRouteRels');
export const stockRouteMoves = records('stockRouteMove', 'stockRouteMoves');
export const stockWhResupplyTables = records('stockWhResupplyTable', 'stockWhResupplyTables');
export const stockPackageTypeStockPutawayRuleRels = records(
  'stockPackageTypeStockPutawayRuleRel',
  'stockPackageTypeStockPutawayRuleRels',
);
export const stockRouteCategTotals = records('stockRouteCategTotal', 'stockRouteCategTotals');
export const peopleForRouting = records('person', 'people');

// Objects of other modules the routing code reads and writes, one helper per object.
export {
  companies as companiesForRouting,
  productCategories,
  productProducts,
  productTemplates,
  stockLocations,
  stockMoveLines,
  stockMoveMoveRels,
  stockMoves,
  stockPickings,
  stockPickingTypes,
  stockQuants,
  stockReferenceMoveRels,
  stockReferences,
  stockWarehouses,
  uomUoms,
} from 'src/stock/stock-records';
