import { SLA_STATE } from 'src/helpdesk-sla/helpdesk-sla-options.constant';
import { type SlaRow } from 'src/helpdesk-sla/types/sla-row.type';

const CHANGED_FIELDS = ['state', 'consumedTime', 'lastStateDate', 'deadline'] as const;

// What a stage save changes on a row. An expired row stays expired. A row in progress adds the working hours
// since its last change. A promise met in time is accomplished; one still open at its deadline expires; a row
// whose case moved before the target stage is open again. A row waiting or running follows the stage: it waits
// in an ignored stage and runs elsewhere. A met or missed promise keeps its deadline; the others plan a new
// one for the hours that are left.
export const planSlaStageChange = ({
  row,
  caseStageId,
  ignoreStageIds,
  stageSequence,
  now,
  workHours,
  plan,
}: {
  row: SlaRow;
  caseStageId: string | null;
  ignoreStageIds: string[];
  stageSequence: (stageId: string | null) => number;
  now: string;
  workHours: (from: string, to: string) => number;
  plan: (hours: number, from: string) => string | null;
}): Partial<SlaRow> => {
  if (row.state === SLA_STATE.EXPIRED) {
    return {};
  }
  const nowTime = Date.parse(now);
  const deadline = row.deadline === null ? null : Date.parse(row.deadline);
  const reached = stageSequence(caseStageId) >= stageSequence(row.expectedStageId);
  let state = row.state;
  let consumedTime = row.consumedTime;

  if (state === SLA_STATE.IN_PROGRESS && row.lastStateDate !== null) {
    consumedTime += workHours(row.lastStateDate, now);
  }
  if (state === SLA_STATE.ACCOMPLISHED && !reached) {
    state = SLA_STATE.IN_PROGRESS;
  } else if ((state === SLA_STATE.IN_PROGRESS || state === SLA_STATE.ON_HOLD) && (deadline === null || deadline >= nowTime) && reached) {
    state = SLA_STATE.ACCOMPLISHED;
  } else if (state === SLA_STATE.IN_PROGRESS && deadline !== null && deadline <= nowTime) {
    state = SLA_STATE.EXPIRED;
  }
  if (state === SLA_STATE.IN_PROGRESS || state === SLA_STATE.ON_HOLD) {
    state = caseStageId !== null && ignoreStageIds.includes(caseStageId) ? SLA_STATE.ON_HOLD : SLA_STATE.IN_PROGRESS;
  }
  const keepDeadline = (state === SLA_STATE.ACCOMPLISHED || state === SLA_STATE.EXPIRED) && row.deadline !== null;
  const next: SlaRow = {
    ...row,
    state,
    consumedTime,
    lastStateDate: now,
    deadline: keepDeadline ? row.deadline : plan(row.hours - consumedTime, now),
  };

  return Object.fromEntries(CHANGED_FIELDS.filter((field) => next[field] !== row[field]).map((field) => [field, next[field]])) as Partial<SlaRow>;
};
