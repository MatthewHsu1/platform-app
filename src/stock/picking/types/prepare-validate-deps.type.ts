import { type TrackingStage } from 'src/stock/lot/types/tracking-stage.type';
import { type PrepareValidatePicking } from 'src/stock/picking/types/prepare-validate-picking.type';

export type PrepareValidateDeps = {
  readPickings: (pickingIds: string[]) => Promise<PrepareValidatePicking[]>;
  confirmPickings: (pickingIds: string[]) => Promise<void>;
  setMoveQuantity: (moveId: string, quantity: number) => Promise<void>;
  markPicked: (moveIds: string[]) => Promise<void>;
  trackingRefusals: (pickingIds: string[], options?: { stage?: TrackingStage }) => Promise<string[]>;
  expiredLotsToConfirm: (pickingIds: string[]) => Promise<string[] | null>;
  // True when the transfers are all the transfers of one batch, the detached ones aside.
  isWholeBatch: (pickingIds: string[], pickingsToDetach: string[]) => Promise<boolean>;
  digits: () => number;
};
