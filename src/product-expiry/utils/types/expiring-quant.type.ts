import { type QuantSnapshot } from 'src/stock/quant/types/quant-snapshot.type';

export type ExpiringQuant = QuantSnapshot & { productId: string; availableQuantity: number | null };
