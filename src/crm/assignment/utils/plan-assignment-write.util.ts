import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';
import { findStage } from 'src/crm/lead/utils/find-stage.util';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';

// Assigning a lead also turns it into an opportunity with a stage of its team.
// A won lead only gets its salesperson. The conversion date is written once,
// when a lead becomes an opportunity.
export const planAssignmentWrite = ({
  lead,
  salespersonId,
  stages,
  now,
}: {
  lead: LeadRow;
  salespersonId: string;
  stages: StageRow[];
  now: string;
}): Record<string, unknown> => {
  const data: Record<string, unknown> = { salespersonId, dateOpen: now };

  if (lead.wonStatus === WON_STATUS.WON) {
    return data;
  }
  data.leadType = LEAD_TYPE.OPPORTUNITY;

  if (lead.leadType === LEAD_TYPE.LEAD) {
    data.dateConversion = now;
  }
  if (lead.stageId === null) {
    const [first] = findStage({ stages, teamId: lead.teamId, foldFilter: false, limit: 'first' });

    data.stageId = first?.id ?? null;
  }
  return data;
};
