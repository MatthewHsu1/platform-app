import { type MoveType } from 'src/stock/types/move-type.type';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { type Priority } from 'src/stock/types/priority.type';

export type ReturnPickingValues = {
  id: string;
  name: string;
  origin: string;
  state: 'DRAFT';
  pickingTypeId: string;
  pickingTypeCode: PickingTypeCode;
  returnPickingId: string;
  locationId: string | null;
  locationDestId: string | null;
  moveType: MoveType;
  priority: Priority;
  scheduledDate: string | null;
  companyId: string | null;
  personId: string | null;
  ownerId: string | null;
  responsibleUserId: null;
  backorderId: null;
  isLocked: true;
  printed: false;
};
