import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOT_ROTTING = { isRotting: false, rottingDays: 0 };

// An open opportunity rots when it stays in its stage longer than the stage
// allows. The days shown are all the days since the stage change.
export const rottingValues = (lead: LeadRow, stage: StageRow | null, now: string) => {
  const threshold = stage?.rottingThresholdDays ?? 0;

  if (
    lead.wonStatus !== WON_STATUS.PENDING ||
    lead.leadType !== LEAD_TYPE.OPPORTUNITY ||
    threshold <= 0 ||
    lead.dateLastStageUpdate === null
  ) {
    return NOT_ROTTING;
  }
  const days = Math.floor((Date.parse(now) - Date.parse(lead.dateLastStageUpdate)) / DAY_MS);

  return days > threshold ? { isRotting: true, rottingDays: days } : NOT_ROTTING;
};
