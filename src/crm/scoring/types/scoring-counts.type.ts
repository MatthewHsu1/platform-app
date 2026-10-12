import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';
import { type ScoringTotal } from 'src/crm/scoring/types/scoring-total.type';

// What the score of a batch of leads reads: rows of the values the leads have,
// and the totals of each variable whose other values were not read.
export type ScoringCounts = { rows: ScoringRow[]; totals: ScoringTotal[] };
