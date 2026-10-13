import { records } from 'src/shared/triggers/records';

export const stockLocations = records('stockLocation', 'stockLocations');
export const stockWarehouses = records('stockWarehouse', 'stockWarehouses');
export const stockPickingTypes = records('stockPickingType', 'stockPickingTypes');
export const irSequences = records('irSequence', 'irSequences');
export const stockPickings = records('stockPicking', 'stockPickings');
export const stockMoves = records('stockMove', 'stockMoves');
export const stockMoveLines = records('stockMoveLine', 'stockMoveLines');
export const stockQuants = records('stockQuant', 'stockQuants');
export const stockReferences = records('stockReference', 'stockReferences');
export const stockReferenceMoveRels = records('stockReferenceMoveRel', 'stockReferenceMoveRels');
export const stockMoveMoveRels = records('stockMoveMoveRel', 'stockMoveMoveRels');
export const stockScraps = records('stockScrap', 'stockScraps');
export const stockScrapReasonTags = records('stockScrapReasonTag', 'stockScrapReasonTags');
export const stockScrapStockScrapReasonTagRels = records(
  'stockScrapStockScrapReasonTagRel',
  'stockScrapStockScrapReasonTagRels',
);
export const platformClaims = records('platformClaim', 'platformClaims');
export const productTemplates = records('productTemplate', 'productTemplates');
export const productProducts = records('productProduct', 'productProducts');
export const productCategories = records('productCategory', 'productCategories');
export const uomUoms = records('uomUom', 'uomUoms');
export const companies = records('company', 'companies');
