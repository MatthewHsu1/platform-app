import { type LeadDays } from 'src/stock/utils/procurement/types/lead-days.type';

// One variant's numbers in the chosen warehouse, in its own unit. toRemove is
// set only when a product of the report tracks expiration dates.
export type ForecastProduct = {
  id: string;
  name: string;
  uomName: string;
  onHand: number;
  free: number;
  incoming: number;
  outgoing: number;
  forecast: number;
  draftIn: number;
  draftOut: number;
  toRemove: number | null;
  leadDays: LeadDays;
};
