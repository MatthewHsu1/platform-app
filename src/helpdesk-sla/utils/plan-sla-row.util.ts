import { SLA_STATE } from 'src/helpdesk-sla/helpdesk-sla-options.constant';
import { type SlaPolicy } from 'src/helpdesk-sla/types/sla-policy.type';

// The row a policy gives a case. Hours are the policy's hours plus its days at the calendar's hours per day.
// The row starts at the case's creation (not at the moment of writing), unless the case sits in an ignored
// stage: then it waits, with no start. A case already at or past the target stage meets the promise at once;
// a policy without a target stage is met at once too, because an empty stage counts as the lowest step.
export const planSlaRow = ({
  policy,
  caseStageId,
  caseCreatedAt,
  stageSequence,
  hoursPerDay,
  plan,
}: {
  policy: SlaPolicy;
  caseStageId: string | null;
  caseCreatedAt: string;
  stageSequence: (stageId: string | null) => number;
  hoursPerDay: number;
  plan: (hours: number, from: string) => string | null;
}) => {
  const hours = policy.hours + hoursPerDay * policy.days;
  const onHold = caseStageId !== null && policy.ignoreStageIds.includes(caseStageId);
  const state = onHold
    ? SLA_STATE.ON_HOLD
    : stageSequence(caseStageId) >= stageSequence(policy.stageId)
      ? SLA_STATE.ACCOMPLISHED
      : SLA_STATE.IN_PROGRESS;
  const lastStateDate = onHold ? null : caseCreatedAt;

  return {
    slaId: policy.id,
    name: policy.name,
    hours,
    expectedStageId: policy.stageId,
    consumedTime: 0,
    lastStateDate,
    state,
    deadline: plan(hours, lastStateDate ?? caseCreatedAt),
  };
};
