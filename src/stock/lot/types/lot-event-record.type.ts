import { type ActorRow } from 'src/stock/types/actor-row.type';

export type LotEventRecord = ActorRow & {
  id: string;
  name: string | null;
  productId: string | null;
  locationId: string | null;
  expirationDate: string | null;
  useDate: string | null;
  removalDate: string | null;
  alertDate: string | null;
};
