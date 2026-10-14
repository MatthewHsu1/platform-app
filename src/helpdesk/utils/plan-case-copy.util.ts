import { NO_NUMBER } from 'src/helpdesk/helpdesk-options.constant';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';

// A copy is a new case: it takes a new number, starts in the first stage of its team, and has no
// assignment date, closing date or original. The other fields are the original's, an empty assignee
// included, so the copy is not given to whoever clicked.
export const planCaseCopy = (original: CaseRow): Record<string, unknown> => ({
  number: NO_NUMBER,
  name: original.name,
  description: original.description,
  assignedUserId: original.assignedUserId,
  personId: original.personId,
  partnerName: original.partnerName,
  partnerEmail: original.partnerEmail,
  teamId: original.teamId,
  categoryId: original.categoryId,
  channel: original.channel,
  priority: original.priority,
  kanbanState: original.kanbanState,
  lastStageUpdate: original.lastStageUpdate,
  active: original.active,
  ...(original.ticketTypeId === undefined ? {} : { ticketTypeId: original.ticketTypeId }),
  ...(original.productId === undefined ? {} : { productId: original.productId }),
  ...(original.fsmLocationId === undefined ? {} : { fsmLocationId: original.fsmLocationId }),
  ...(original.resolution === undefined ? {} : { resolution: original.resolution }),
});
