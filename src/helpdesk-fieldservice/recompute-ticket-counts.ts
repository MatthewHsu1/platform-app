import { fsmLocations } from 'src/fieldservice/fieldservice-records';
import { ticketCounts } from 'src/helpdesk-fieldservice/utils/ticket-counts.util';
import { findMany, records } from 'src/shared/triggers/records';

const cases = records('helpdeskTicket', 'helpdeskTickets');

// The one writer of the work case count of a location. Only the locations a case save named are counted, and
// only a count that differs is written.
export const recomputeTicketCounts = async (locationIds: (string | null | undefined)[]) => {
  const ids = [...new Set(locationIds.flatMap((id) => id ?? []))];

  if (ids.length === 0) {
    return;
  }
  const found = await findMany<{
    locations: { id: string; ticketCount: number | null }[];
    cases: { fsmLocationId: string | null; active: boolean | null }[];
  }>({
    locations: { of: fsmLocations, filter: { id: { in: ids } }, selection: 'id ticketCount' },
    cases: { of: cases, filter: { fsmLocationId: { in: ids } }, selection: 'fsmLocationId active' },
  });
  const stored = new Map(found.locations.map((location) => [location.id, location.ticketCount]));

  for (const counts of ticketCounts([...stored.keys()], found.cases)) {
    if (stored.get(counts.id) !== counts.ticketCount) {
      await fsmLocations.update(counts.id, { ticketCount: counts.ticketCount });
    }
  }
};
