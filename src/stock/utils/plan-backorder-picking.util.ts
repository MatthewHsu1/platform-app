import { type PickingRow } from 'src/stock/types/picking-row.type';

export const planBackorderPicking = ({ original, note, name }: { original: PickingRow; note: unknown; name: string }) => ({
  name,
  origin: original.origin,
  note,
  moveType: original.moveType,
  priority: original.priority,
  scheduledDate: original.scheduledDate,
  dateDeadline: original.dateDeadline,
  locationId: original.locationId,
  locationDestId: original.locationDestId,
  pickingTypeId: original.pickingTypeId,
  pickingTypeCode: original.pickingTypeCode,
  companyId: original.companyId,
  personId: original.personId,
  ownerId: original.ownerId,
  backorderId: original.id,
  returnPickingId: original.returnPickingId,
});
