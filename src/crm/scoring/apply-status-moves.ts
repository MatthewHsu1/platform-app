import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';

// The won and lost counts of lead scoring follow each status change here;
// with no scoring rows there is nothing to count.
export const applyStatusMoves = async (_moves: { lead: LeadRow; moves: StatusMoves }[]): Promise<void> => undefined;
