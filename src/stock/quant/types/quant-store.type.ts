import { type QuantSnapshot } from 'src/stock/quant/types/quant-snapshot.type';
import { type ReservationLine } from 'src/stock/quant/types/reservation-line.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

export type QuantStore = {
  findByKey: (key: string) => Promise<QuantSnapshot | null>;
  // null when another run created the key first (unique index clash).
  create: (
    key: string,
    values: { quantity: number; reservedQuantity: number; inDate: string },
  ) => Promise<QuantSnapshot | null>;
  compareAndSet: (id: string, version: number, data: Record<string, unknown>) => Promise<boolean>;
  locationUsage: (locationId: string) => Promise<LocationUsage>;
  openLines: (key: string) => Promise<ReservationLine[]>;
  destroyLines: (ids: string[]) => Promise<void>;
  shrinkLine: (id: string, quantity: number, quantityProductUom: number) => Promise<void>;
  // Done lines into the key minus done lines out of it, plus the lot compensations into it minus those out of it,
  // in the product unit.
  ledgerTotal: (key: string) => Promise<number>;
  wait: (ms: number) => Promise<void>;
  now: () => string;
  digits: () => number;
};
