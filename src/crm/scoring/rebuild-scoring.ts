import { WON_STATUS } from 'src/crm/crm-options.constant';
import { readLeadRow } from 'src/crm/lead/lead-selection';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { CRM_LEAD_SCORING_FREQUENCIES } from 'src/crm/scoring/crm-lead-scoring-frequencies';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { planRebuildRows } from 'src/crm/scoring/utils/plan-rebuild-rows.util';
import { planRebuildWrites } from 'src/crm/scoring/utils/plan-rebuild-writes.util';
import { isScoringStartDate } from 'src/crm/scoring/utils/scoring-pairs.util';
import { readWithScoringFields } from 'src/crm/lead/utils/read-with-scoring-fields.util';
import { scoreLeads } from 'src/crm/scoring/utils/score-leads.util';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { records } from 'src/shared/triggers/records';

const LEADS = records('crmLead', 'crmLeads');

const findLeads = async (filter: Record<string, unknown>) =>
  (await readWithScoringFields((selection) => LEADS.find<Record<string, unknown>>(filter, selection), { withTeam: true })).map(readLeadRow);

// Empties the counts, counts every closed lead again, then rescores the open
// leads. The counts are emptied first even when the start date is missing or
// bad, which leaves them empty. The probability writes are plain updates: no
// save rule runs, and the clamp keeps every status as it was. A run that just
// stored new settings passes them, since its own variables are read when it
// starts.
export const rebuildScoring = async (
  overrides: { plsStartDate: string; plsFields: PlsFieldKey[] } | null = null,
): Promise<{ rows: number; leadsWritten: number }> => {
  const existing = await CRM_LEAD_SCORING_FREQUENCIES.findIncludingDeleted<{ id: string }>({}, 'id');

  await CRM_LEAD_SCORING_FREQUENCIES.destroyMany(existing.map((row) => row.id));

  const { plsStartDate, plsFields } = overrides ?? (await readCrmSettings());

  if (!isScoringStartDate(plsStartDate)) {
    return { rows: 0, leadsWritten: 0 };
  }
  const since = `${plsStartDate}T00:00:00.000Z`;
  const closedLeads = await findLeads({ createdAt: { gte: since }, wonStatus: { in: [WON_STATUS.WON, WON_STATUS.LOST] } });
  const { stages } = await loadLeadContext([]);
  const creates = planRebuildRows(closedLeads, stages, plsFields);
  await CRM_LEAD_SCORING_FREQUENCIES.createMany(creates);
  const pending = await findLeads({ createdAt: { gte: since }, wonStatus: { eq: WON_STATUS.PENDING }, stageId: { is: 'NOT_NULL' } });
  // The score reads only the counts, so the planned rows serve without their stored ids.
  const rows = creates.map((created, index) => ({ ...created, id: `planned-${index}`, createdAt: since }));
  const writes = planRebuildWrites(pending, scoreLeads(pending, rows, stages, plsFields));

  for (const write of writes) {
    await LEADS.updateMany(write.ids, write.data);
  }

  return { rows: creates.length, leadsWritten: writes.reduce((sum, write) => sum + write.ids.length, 0) };
};
