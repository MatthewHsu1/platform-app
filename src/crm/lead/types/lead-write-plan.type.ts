import { type PersonPush } from 'src/crm/lead/types/person-push.type';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';

export type LeadWritePlan =
  | { kind: 'write'; data: Record<string, unknown>; statusMoves: StatusMoves; personPush: PersonPush | null }
  | {
      kind: 'refuse';
      reason: string;
      undo: { kind: 'destroy' } | { kind: 'putBack'; data: Record<string, unknown> };
    };
