import { planCaseCopy } from 'src/helpdesk/utils/plan-case-copy.util';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';
import { records } from 'src/shared/triggers/records';

const cases = records('helpdeskTicket', 'helpdeskTickets');
const tagLinks = records('helpdeskTicketTagRel', 'helpdeskTicketTagRels');
const relatedLinks = records('helpdeskTicketRelated', 'helpdeskTicketRelateds');

// The copy is made with the app token: its last stage update is a value only the app writes, and an app
// create is not given to whoever clicked. The copy's related links are one-way, because the related
// trigger leaves links the app makes alone. A copy that cannot get its links is destroyed again.
export const copyCase = async (original: CaseRow, links: { tagIds: string[]; relatedTicketIds: string[] }) => {
  const [copyId] = await cases.createMany([planCaseCopy(original)]);

  try {
    if (links.tagIds.length > 0) {
      await tagLinks.createMany(links.tagIds.map((tagId) => ({ ticketId: copyId, tagId })));
    }
    if (links.relatedTicketIds.length > 0) {
      await relatedLinks.createMany(links.relatedTicketIds.map((relatedTicketId) => ({ ticketId: copyId, relatedTicketId })));
    }
  } catch (error) {
    await cases.destroyMany([copyId]);
    throw error;
  }

  return copyId;
};
