import { type LotToRemind } from 'src/product-expiry/utils/types/lot-to-remind.type';

export type AlertLot = LotToRemind & { responsibleId: string | null };
