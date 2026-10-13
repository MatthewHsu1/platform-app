import { CRM_LEAD_SCORING_FREQUENCIES } from 'src/crm/scoring/crm-lead-scoring-frequencies';
import { makeReadLeadScoring } from 'src/crm/scoring/read-lead-scoring';
import { SCORING_ROW_SELECTION } from 'src/crm/scoring/scoring-variables.constant';
import { type ScoringRow } from 'src/crm/scoring/types/scoring-row.type';
import { type ScoringTotal } from 'src/crm/scoring/types/scoring-total.type';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

// Twenty returns 50 groups unless told otherwise; a group is one variable in one team.
const GROUP_LIMIT = 5000;

type TotalGroup = { groupByDimensionValues: [string | null, string | null]; sumWonCount: number | null; sumLostCount: number | null };

const sumRows = async (variables: string[]): Promise<ScoringTotal[] | null> => {
  const data = requireData(
    await twentyGraphql<{ crmLeadScoringFrequenciesGroupBy: TotalGroup[] }>(
      'application',
      `query ScoringTotals($filter: CrmLeadScoringFrequencyFilterInput, $limit: Int) {
        crmLeadScoringFrequenciesGroupBy(groupBy: [{ variable: true }, { teamId: true }], filter: $filter, limit: $limit) {
          groupByDimensionValues
          sumWonCount
          sumLostCount
        }
      }`,
      { filter: { variable: { in: variables } }, limit: GROUP_LIMIT },
    ),
    'Sum the scoring counts',
  );

  // A full answer may be cut: the caller then reads the rows instead.
  if (data.crmLeadScoringFrequenciesGroupBy.length >= GROUP_LIMIT) {
    return null;
  }
  return data.crmLeadScoringFrequenciesGroupBy.map((group) => ({
    variable: group.groupByDimensionValues[0] ?? '',
    teamId: group.groupByDimensionValues[1] ?? null,
    wonCount: group.sumWonCount ?? 0,
    lostCount: group.sumLostCount ?? 0,
  }));
};

export const readLeadScoring = makeReadLeadScoring({
  findRows: (filter) => CRM_LEAD_SCORING_FREQUENCIES.find<ScoringRow>(filter, SCORING_ROW_SELECTION),
  sumRows,
});
