import { type PutawaySublocation } from 'src/stock/putaway/types/putaway-sublocation.type';

export type PutawayRule = {
  id: string;
  productId: string | null;
  categoryId: string | null;
  packageTypeIds: string[];
  locationOutId: string;
  storageCategoryId: string | null;
  sublocation: PutawaySublocation;
};
