import { records } from 'src/shared/triggers/records';

export const stockPickingBatches = records('stockPickingBatch', 'stockPickingBatches');
export { stockMoveLines, stockMoves, stockPickings, stockPickingTypes } from 'src/stock/stock-records';
export const waveCategoryLinks = records('productCategoryStockPickingTypeRel', 'productCategoryStockPickingTypeRels');
export const waveLocationLinks = records('stockLocationStockPickingTypeRel', 'stockLocationStockPickingTypeRels');
