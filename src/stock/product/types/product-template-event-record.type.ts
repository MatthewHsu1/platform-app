import { type ActorRow } from 'src/stock/types/actor-row.type';

export type ProductTemplateEventRecord = ActorRow & {
  id: string;
  productType: string;
  isStorable: boolean;
  uomId: string | null;
  responsibleId: string | null;
};
