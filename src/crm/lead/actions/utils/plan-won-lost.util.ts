import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';
import { type LeadUpdatePlan } from 'src/crm/lead/actions/utils/types/lead-update-plan.type';
import { type LostCandidate } from 'src/crm/lead/actions/utils/types/lost-candidate.type';
import { type MarkLostPlan } from 'src/crm/lead/actions/utils/types/mark-lost-plan.type';
import { type ProbabilityPlan } from 'src/crm/lead/actions/utils/types/probability-plan.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { findStage } from 'src/crm/lead/utils/find-stage.util';
import { floatRound } from 'src/shared/utils/float-round.util';

export const MARK_WON_NOT_OPPORTUNITY = 'Only an opportunity can be marked won. Convert the lead first.';
export const MARK_WON_ALREADY_WON = 'This lead is already won.';
export const MARK_WON_LOST = 'A lost lead must be restored before it is marked won.';
export const MARK_WON_NO_STAGE = "No won stage fits this lead's sales team. Mark a stage as won first.";
export const MARK_LOST_WON = 'A won lead cannot be marked lost: {names}.';
export const MARK_LOST_IN_WON_STAGE =
  'A lead in a won stage stays at 100 %. Move these leads to another stage first: {names}.';
export const RESTORE_NOT_LOST = 'Only a lost lead can be restored.';
export const AUTOMATIC_NOT_PENDING = 'Only a pending lead can follow the automatic probability.';
export const AUTOMATIC_ALREADY = 'The probability already follows the automatic one.';
export const LOST_COMMENT_TITLE = 'Lost comment';

// The won stage after the lead's current stage, or else the last one before
// it, among won stages for all teams or the lead's team. With won stages
// spread through the pipeline, the lead lands in the one that closes its part.
// The save rules then set the closed date and the won status.
export const planMarkWon = ({
  lead,
  stages,
}: {
  lead: Pick<LeadRow, 'leadType' | 'wonStatus' | 'stageId' | 'teamId'>;
  stages: StageRow[];
}): LeadUpdatePlan => {
  if (lead.leadType !== LEAD_TYPE.OPPORTUNITY) {
    return { kind: 'refuse', reason: MARK_WON_NOT_OPPORTUNITY };
  }
  if (lead.wonStatus === WON_STATUS.WON) {
    return { kind: 'refuse', reason: MARK_WON_ALREADY_WON };
  }
  if (lead.wonStatus === WON_STATUS.LOST) {
    return { kind: 'refuse', reason: MARK_WON_LOST };
  }
  const wonStages = findStage({ stages, teamId: lead.teamId, onlyWon: true, foldFilter: false, limit: 'all' });
  const currentSequence = stages.find((stage) => stage.id === lead.stageId)?.sequence ?? 0;
  const target =
    wonStages.find((stage) => stage.sequence > currentSequence) ??
    [...wonStages].reverse().find((stage) => stage.sequence <= currentSequence);

  if (target === undefined) {
    return { kind: 'refuse', reason: MARK_WON_NO_STAGE };
  }

  return { kind: 'update', data: { stageId: target.id, probability: 100 } };
};

const namesOf = (leads: LostCandidate[]) => leads.map((lead) => lead.name ?? lead.id).join(', ');

// A probability follows the automatic one when both agree to the cent; an
// empty probability counts as 0.
export const sameAtTwoDecimals = (left: number | null, right: number | null) =>
  floatRound((left ?? 0) - (right ?? 0), 0.01) === 0;

// Lost means probability 0 and out of the pipeline. The reason is optional and
// an empty choice clears an old one. A lead already lost is marked again, so a
// run that stopped part-way can be repeated. The closed date comes from the
// save rules.
export const planMarkLost = ({
  leads,
  lostReasonId,
}: {
  leads: LostCandidate[];
  lostReasonId: string | null;
}): MarkLostPlan => {
  const won = leads.filter((lead) => lead.wonStatus === WON_STATUS.WON);

  if (won.length > 0) {
    return { kind: 'refuse', reason: MARK_LOST_WON, values: { names: namesOf(won) } };
  }

  // Checked before the save: afterwards the won-stage rule would undo some
  // leads and keep others.
  const inWonStage = leads.filter((lead) => lead.stageIsWon);

  if (inWonStage.length > 0) {
    return { kind: 'refuse', reason: MARK_LOST_IN_WON_STAGE, values: { names: namesOf(inWonStage) } };
  }

  return {
    kind: 'update',
    userData: { wonStatus: WON_STATUS.LOST, probability: 0, lostReasonId },
    appData: { automatedProbability: 0 },
  };
};

// Back into the pipeline without its reason; the probability takes the score
// computed now, so the lead follows the automatic probability again.
export const planRestore = ({
  wonStatus,
  storedAutomated,
  newAutomated,
}: {
  wonStatus: string | null;
  storedAutomated: number | null;
  newAutomated: number;
}): ProbabilityPlan => {
  if (wonStatus !== WON_STATUS.LOST) {
    return { kind: 'refuse', reason: RESTORE_NOT_LOST };
  }

  return {
    kind: 'update',
    appData: newAutomated === storedAutomated ? null : { automatedProbability: newAutomated },
    userData: { wonStatus: WON_STATUS.PENDING, lostReasonId: null, probability: newAutomated },
  };
};

export const planUseAutomaticProbability = ({
  wonStatus,
  probability,
  storedAutomated,
  newAutomated,
}: {
  wonStatus: string | null;
  probability: number | null;
  storedAutomated: number | null;
  newAutomated: number;
}): ProbabilityPlan => {
  if (wonStatus !== WON_STATUS.PENDING) {
    return { kind: 'refuse', reason: AUTOMATIC_NOT_PENDING };
  }

  // The button cannot be hidden by comparing two fields, so the route says no.
  if (sameAtTwoDecimals(probability, storedAutomated)) {
    return { kind: 'refuse', reason: AUTOMATIC_ALREADY };
  }

  return {
    kind: 'update',
    appData: newAutomated === storedAutomated ? null : { automatedProbability: newAutomated },
    userData: { probability: newAutomated },
  };
};
