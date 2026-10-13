import { type PickingRow } from 'src/stock/types/picking-row.type';

export type ReturnSourcePicking = Pick<
  PickingRow,
  | 'id'
  | 'name'
  | 'locationId'
  | 'locationDestId'
  | 'pickingTypeId'
  | 'moveType'
  | 'priority'
  | 'scheduledDate'
  | 'companyId'
  | 'personId'
  | 'ownerId'
>;
