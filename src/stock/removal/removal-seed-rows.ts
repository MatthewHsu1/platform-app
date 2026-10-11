import { type SeedRow } from 'src/shared/install/install-spec.type';

// The four strategies the stock module ships; the expiry module adds FEFO.
export const REMOVAL_SEED_ROWS: SeedRow[] = [
  { seedKey: 'stock.removal_fifo', values: { name: 'First In First Out (FIFO)', method: 'FIFO' } },
  { seedKey: 'stock.removal_lifo', values: { name: 'Last In First Out (LIFO)', method: 'LIFO' } },
  { seedKey: 'stock.removal_closest', values: { name: 'Closest Location', method: 'CLOSEST' } },
  { seedKey: 'stock.removal_least_packages', values: { name: 'Least Packages', method: 'LEAST_PACKAGES' } },
];
