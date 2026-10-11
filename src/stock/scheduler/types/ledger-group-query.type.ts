import { type LedgerDimension } from 'src/stock/scheduler/types/ledger-dimension.type';

// Sums of done lines per value of the asked dimensions, for lines whose dimension values are in the listed values
// (null: no value), or, with `exclude`, whose dimension has a value that is not among the listed ones; `in` sums lines by destination, `out` by source. At most `limit` groups come back.
export type LedgerGroupQuery = (args: {
  side: 'in' | 'out';
  conditions: { dimension: LedgerDimension; values: (string | null)[]; exclude?: boolean }[];
  dimensions: LedgerDimension[];
  limit: number;
}) => Promise<{ values: (string | null)[]; sum: number }[]>;
