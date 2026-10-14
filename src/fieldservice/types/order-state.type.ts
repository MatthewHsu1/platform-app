import { type AreaChain } from 'src/fieldservice/types/area-chain.type';

// A service order as the order trigger reads it; rich text fields hold their markdown.
export type OrderState = AreaChain & {
  id: string;
  name: string | null;
  stage: string | null;
  closedStatus: string | null;
  priority: string | null;
  teamId: string | null;
  locationId: string | null;
  locationDirections: string | null;
  requestEarly: string | null;
  requestLate: string | null;
  personId: string | null;
  scheduledDateStart: string | null;
  scheduledDuration: number;
  scheduledDateEnd: string | null;
  dateStart: string | null;
  dateEnd: string | null;
  duration: number;
  templateId: string | null;
  todo: string | null;
};
