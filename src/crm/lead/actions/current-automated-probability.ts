import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

// The automated probability scored now. Without a score (no scoring data yet)
// the stored value stands.
export const currentAutomatedProbability = async (lead: LeadRow) => {
  const context = await loadLeadContext([lead]);

  return context.score?.(lead) ?? lead.automatedProbability ?? 0;
};
