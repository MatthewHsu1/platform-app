import { type AreaChain } from 'src/fieldservice/types/area-chain.type';
import { type HolidayRow } from 'src/fieldservice/types/holiday-row.type';
import { type HoursByPriority } from 'src/fieldservice/types/hours-by-priority.type';

// What an order save reads besides the order: its location, the teams in sequence order, its template's
// instructions, every time off, and the hours a request may wait by priority.
export type OrderSaveContext = {
  now: string;
  location: (AreaChain & { teamId: string | null; completeDirection: string | null }) | null;
  teamsBySequence: { id: string }[];
  templateInstructions: string | null;
  holidays: HolidayRow[];
  hoursByPriority: HoursByPriority;
};
