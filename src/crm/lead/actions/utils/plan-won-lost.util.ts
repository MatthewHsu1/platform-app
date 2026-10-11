import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';
import { type LeadUpdatePlan } from 'src/crm/lead/actions/utils/types/lead-update-plan.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { findStage } from 'src/crm/lead/utils/find-stage.util';

export const MARK_WON_NOT_OPPORTUNITY = 'Only an opportunity can be marked won. Convert the lead first.';
export const MARK_WON_ALREADY_WON = 'This lead is already won.';
export const MARK_WON_LOST = 'A lost lead must be restored before it is marked won.';
export const MARK_WON_NO_STAGE = "No won stage fits this lead's sales team. Mark a stage as won first.";

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

// Probability 0 and an optional reason. The lead is not archived: Twenty has
// no archive, so views filter on wonStatus.
export const planMarkLost = ({
  wonStatus,
  lostReasonId,
  now,
}: {
  wonStatus: string | null;
  lostReasonId: string | null;
  now: string;
}): LeadUpdatePlan => {
  if (wonStatus !== WON_STATUS.PENDING) {
    return { kind: 'refuse', reason: 'Only a pending lead can be marked lost.' };
  }

  return {
    kind: 'update',
    data: { wonStatus: WON_STATUS.LOST, probability: 0, dateClosed: now, lostReasonId },
  };
};

// Back into the pipeline without its lost reason.
export const planRestore = ({ wonStatus }: { wonStatus: string | null }): LeadUpdatePlan => {
  if (wonStatus !== WON_STATUS.LOST) {
    return { kind: 'refuse', reason: 'Only a lost lead can be restored.' };
  }

  return {
    kind: 'update',
    data: { wonStatus: WON_STATUS.PENDING, lostReasonId: null, dateClosed: null },
  };
};
