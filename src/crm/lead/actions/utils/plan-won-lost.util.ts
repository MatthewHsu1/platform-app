import { WON_STAGE_VALUE, WON_STATUS } from 'src/crm/crm-options.constant';

export type LeadUpdatePlan =
  | { kind: 'refuse'; reason: string }
  | { kind: 'update'; data: Record<string, string | number | null> };

// Won from any state, probability 100, into the
// won stage. Stage is a staff list here, so the move happens only while the
// Won option exists.
export const planMarkWon = ({
  wonStatus,
  stageOptionValues,
  now,
}: {
  wonStatus: string | null;
  stageOptionValues: string[];
  now: string;
}): LeadUpdatePlan => {
  if (wonStatus === WON_STATUS.WON) {
    return { kind: 'refuse', reason: 'This lead is already won.' };
  }

  return {
    kind: 'update',
    data: {
      wonStatus: WON_STATUS.WON,
      probability: 100,
      dateClosed: now,
      lostReasonId: null,
      ...(stageOptionValues.includes(WON_STAGE_VALUE) && { stage: WON_STAGE_VALUE }),
    },
  };
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
