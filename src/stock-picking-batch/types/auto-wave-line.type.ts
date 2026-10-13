import { type GroupValues } from 'src/stock-picking-batch/types/group-values.type';

// A move line auto wave may put in a wave. The two dates order new waves by
// transfer, then move, in the order they were made. The line is grouped by
// its move's contact and country; `groupValues` are its transfer's, for the
// wave description and the locations.
export type AutoWaveLine = {
  id: string;
  pickingId: string;
  pickingCreatedAt: string;
  moveId: string;
  moveCreatedAt: string;
  pickingTypeId: string;
  pickingState: string;
  quantity: number;
  inWave: boolean;
  productId: string;
  productName: string;
  categoryId: string | null;
  categoryCompleteName: string;
  locationId: string;
  locationDestId: string;
  partnerKey: string | null;
  countryKey: string | null;
  groupValues: GroupValues;
};
