import { type ReturnRow } from 'src/stock/utils/types/return-row.type';

export type ReturnRowsPlan = { kind: 'refuse'; reason: string } | { kind: 'rows'; rows: ReturnRow[] };
