import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { type ScoringCounts } from 'src/crm/scoring/types/scoring-counts.type';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';
import { type ScoringTotal } from 'src/crm/scoring/types/scoring-total.type';
import { planScoringRead } from 'src/crm/scoring/utils/plan-scoring-read.util';

type ScoringReadApi = {
  findRows: (filter: Record<string, unknown>) => Promise<ScoringRow[]>;
  // null when the server cut the answer at its group limit.
  sumRows: (variables: string[]) => Promise<ScoringTotal[] | null>;
};

// One read of the rows and one of the totals per batch, whatever the number
// of rows the table holds. Totals the server cut short would give wrong
// scores, so then every row of the variables is read and summed here.
export const makeReadLeadScoring =
  (api: ScoringReadApi) =>
  async (leads: LeadRow[], fields: readonly PlsFieldKey[]): Promise<ScoringCounts> => {
    const { filter, summedVariables, usedVariables } = planScoringRead(leads, fields);

    if (filter === null) {
      return { rows: [], totals: [] };
    }
    const [rows, totals] = await Promise.all([
      api.findRows(filter),
      summedVariables.length === 0 ? Promise.resolve([]) : api.sumRows(summedVariables),
    ]);

    if (totals === null) {
      return { rows: await api.findRows({ variable: { in: usedVariables } }), totals: [] };
    }
    return { rows, totals };
  };
