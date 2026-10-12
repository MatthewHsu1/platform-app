import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { queryLeads } from 'src/crm/lead/query-leads';
import { planRottingWrites } from 'src/crm/lead/utils/plan-rotting-writes.util';
import { records } from 'src/shared/triggers/records';

const LEADS = records('crmLead', 'crmLeads');

// Open opportunities in the given stages (every stage with days to rot when
// none are given), and every lead still flagged there, get their rotting
// values again. Plain app writes: no save rule depends on them.
export const recomputeRotting = async (stageIds: string[] | null, now = new Date().toISOString()) => {
  const { stages } = await loadLeadContext([]);
  const watched = stageIds ?? stages.filter((stage) => stage.rottingThresholdDays > 0).map((stage) => stage.id);
  const leads = await queryLeads('application', {
    or: [
      { isRotting: { eq: true }, ...(stageIds === null ? {} : { stageId: { in: stageIds } }) },
      { stageId: { in: watched }, wonStatus: { eq: WON_STATUS.PENDING }, leadType: { eq: LEAD_TYPE.OPPORTUNITY } },
    ],
  });
  const writes = planRottingWrites(leads, stages, now);

  for (const write of writes) {
    await LEADS.updateMany(write.ids, write.data);
  }

  return writes.reduce((sum, write) => sum + write.ids.length, 0);
};
