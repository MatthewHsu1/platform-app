import { type PushedMoveValues } from 'src/stock/utils/procurement/types/pushed-move-values.type';

export type PushPlan =
  | { kind: 'skip' }
  // No rule applies: downstream moves outside the destination lose the link.
  | { kind: 'none'; breakLinks: string[] }
  | { kind: 'transparent'; ruleId: string; date: string; locationDestId: string; destinationChanged: boolean }
  | {
      kind: 'manual';
      ruleId: string;
      newMove: PushedMoveValues;
      // The done move feeds the new move unless the new move's source skips reservation.
      linkFromDone: boolean;
      // Downstream moves that now hang on the new move, and the ones cut loose.
      relinkToNewMove: string[];
      breakLinks: string[];
    };
