import { type QuantSnapshot } from 'src/stock/quant/types/quant-snapshot.type';

// A stock row of a lot, with the dates it copies from the lot.
export type LotQuant = QuantSnapshot & { lotId: string; expirationDate: string | null };
