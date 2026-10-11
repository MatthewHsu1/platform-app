import { type PickingState } from 'src/stock/types/picking-state.type';

export type LinePicking = {
  id: string;
  name: string | null;
  state: PickingState;
  locationId: string | null;
  locationDestId: string | null;
  pickingTypeId: string | null;
  ownerId: string | null;
  companyId: string | null;
  personId: string | null;
};
