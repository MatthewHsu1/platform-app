import { type RelatedLink } from 'src/helpdesk-ticket-related/types/related-link.type';

const pairKey = (ticketId: string, relatedTicketId: string) => `${ticketId}|${relatedTicketId}`;

// Related cases are related both ways: a link staff make gets its link back, and removing a link
// removes its link back.
export const planRelatedMirror = ({
  created,
  destroyed,
  existing,
}: {
  created: RelatedLink[];
  destroyed: RelatedLink[];
  existing: RelatedLink[];
}) => {
  const present = new Map(existing.map((row) => [pairKey(row.ticketId, row.relatedTicketId), row.id]));
  const create: { ticketId: string; relatedTicketId: string }[] = [];

  for (const row of created) {
    const back = pairKey(row.relatedTicketId, row.ticketId);

    if (row.ticketId !== row.relatedTicketId && !present.has(back)) {
      create.push({ ticketId: row.relatedTicketId, relatedTicketId: row.ticketId });
      present.set(back, 'planned');
    }
  }

  const destroy = destroyed.flatMap((row) => {
    const backId = present.get(pairKey(row.relatedTicketId, row.ticketId));

    return row.ticketId === row.relatedTicketId || backId === undefined || backId === 'planned' ? [] : [backId];
  });

  return { create, destroy: [...new Set(destroy)] };
};
