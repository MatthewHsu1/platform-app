import { type ReceptionLine } from 'src/stock/utils/types/reception-line.type';

export type ReceptionSource = {
  pickingId: string;
  pickingName: string;
  scheduledDate: string | null;
  lines: ReceptionLine[];
};
