import { stockPickings, stockPickingTypes } from 'src/stock/stock-records';
import { PICKING_ROW, PICKING_TYPE_ROW } from 'src/stock/stock-rows';
import { type PickingRow } from 'src/stock/types/picking-row.type';
import { type PickingTypeRow } from 'src/stock/types/picking-type-row.type';

export const readPicking = async (id: string) =>
  (await stockPickings.find<PickingRow>({ id: { eq: id } }, PICKING_ROW))[0];

export const readPickingType = async (id: string | null) =>
  id === null ? undefined : (await stockPickingTypes.find<PickingTypeRow>({ id: { eq: id } }, PICKING_TYPE_ROW))[0];
