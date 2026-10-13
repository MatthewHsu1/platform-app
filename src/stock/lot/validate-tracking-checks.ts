import { findExpiredLotsQuestion } from 'src/product-expiry/validate/find-expired-lots-question';
import { checkTrackingBeforeCommit } from 'src/stock/lot/validate/check-tracking-before-commit';
import { type TrackingStage } from 'src/stock/lot/types/tracking-stage.type';

// Lot, serial and package refusals checked before Validate claims; one stage, or both in order. The refusal
// Validate returns is in English.
export const trackingRefusals = async (pickingIds: string[], options?: { stage?: TrackingStage }): Promise<string[]> =>
  checkTrackingBeforeCommit(pickingIds, 'en', options?.stage);

// The expired lots the user must confirm before Validate, or null when nothing is expired. The list can be empty: a
// line past its removal date whose lot is not made yet still asks.
export const expiredLotsToConfirm = async (pickingIds: string[]): Promise<string[] | null> =>
  (await findExpiredLotsQuestion(pickingIds))?.lotIds ?? null;
