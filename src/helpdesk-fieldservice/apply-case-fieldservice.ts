import { fsmLocations, fsmOrders } from 'src/fieldservice/fieldservice-records';
import { type CaseEvent } from 'src/helpdesk/ticket/types/case-event.type';
import { type CaseLocationPartner } from 'src/helpdesk-fieldservice/types/case-location-partner.type';
import { companyCommercialKey, locationCommercialKey, personCommercialKey } from 'src/helpdesk-fieldservice/utils/commercial-partner-key.util';
import { planCaseCloseGuard } from 'src/helpdesk-fieldservice/utils/plan-case-close-guard.util';
import { planCaseLocation } from 'src/helpdesk-fieldservice/utils/plan-case-location.util';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { putBack } from 'src/shared/triggers/put-back';
import { findMany, records } from 'src/shared/triggers/records';
import { type ErrorCollector, errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { localizedReason } from 'src/stock/stock-event-helpers';

const cases = records('helpdeskTicket', 'helpdeskTickets');
const stages = records('helpdeskTicketStage', 'helpdeskTicketStages');
const people = records('person', 'people');
const companies = records('company', 'companies');

const STAGE_FIELDS = ['stage', 'stageId'];
const PERSON_FIELDS = ['person', 'personId'];
const COMPANY_FIELDS = ['company', 'companyId'];
const LOCATION_FIELDS = ['fsmLocation', 'fsmLocationId'];

// A staff save that moves a work case to a closed stage while one of its service orders is open is refused:
// the old stage goes back with a note. The events come back with that stage change taken out, so the case rules
// that follow plan the case as it stands and stamp no closed date. The app's own stage moves are never refused.
export const refuseCloseWithOpenOrders = async (events: CaseEvent[], errors: ErrorCollector): Promise<CaseEvent[]> => {
  const moves = new Map<string, CaseEvent>();

  for (const event of events) {
    if (event.before !== null && !isApplicationWrite(event.after) && event.after.stageId !== null && event.before.stageId !== event.after.stageId) {
      moves.set(event.recordId, event);
    }
  }
  if (moves.size === 0) {
    return events;
  }
  const found = await findMany<{
    stages: { id: string; closed: boolean | null }[];
    orders: { ticketId: string; closedStatus: string | null }[];
  }>({
    stages: { of: stages, filter: { id: { in: [...moves.values()].map((event) => event.after.stageId) } }, selection: 'id closed' },
    orders: { of: fsmOrders, filter: { ticketId: { in: [...moves.keys()] } }, selection: 'ticketId closedStatus' },
  });
  const closedStages = new Set(found.stages.filter((stage) => stage.closed === true).map((stage) => stage.id));
  const refused = new Set<CaseEvent>();

  for (const [caseId, event] of moves) {
    const plan = planCaseCloseGuard({
      stageClosed: closedStages.has(event.after.stageId ?? ''),
      orderClosedStatuses: found.orders.filter((order) => order.ticketId === caseId).map((order) => order.closedStatus),
    });

    if (!plan.allow) {
      await errors.run(caseId, async () => {
        await putBack({
          objectSingular: 'helpdeskTicket',
          objectPlural: 'helpdeskTickets',
          recordId: caseId,
          data: { stageId: event.before?.stageId ?? null },
          reason: await localizedReason({ workspaceMemberId: event.workspaceMemberId ?? undefined }, plan.reason),
        });
        refused.add(event);
      });
    }
  }

  return events.map((event) =>
    refused.has(event)
      ? {
          ...event,
          after: { ...event.after, stageId: event.before?.stageId ?? null },
          updatedFields: event.updatedFields.filter((field) => !STAGE_FIELDS.includes(field)),
        }
      : event,
  );
};

type PersonNode = { id: string; companyId: string | null; serviceLocationId: string | null };
type LocationNode = { id: string; partnerPersonId: string | null; partnerCompanyId: string | null; ownerPersonId: string | null; ownerCompanyId: string | null };

// A new work case, and a case whose contact changed, takes the service location of its contact. A location given
// with the save stays. The contact is the case's person; a case with only a company (set by a staff save) counts
// as that company. The company the app copies from a changed contact is not a change of contact. Returns the
// locations it set.
export const fillCaseLocations = async (events: CaseEvent[], operation: 'created' | 'updated'): Promise<string[]> => {
  const wrote = (event: CaseEvent, fields: string[]) => event.updatedFields.some((field) => fields.includes(field));
  const selected = events.filter((event) => operation === 'created' || !wrote(event, LOCATION_FIELDS));
  const wrotePerson = new Set(selected.filter((event) => wrote(event, PERSON_FIELDS)).map((event) => event.recordId));
  const wroteCompany = new Set(
    selected.filter((event) => !isApplicationWrite(event.after) && wrote(event, COMPANY_FIELDS)).map((event) => event.recordId),
  );
  const ids = [...new Set(selected.filter((event) => operation === 'created' || wrotePerson.has(event.recordId) || wroteCompany.has(event.recordId)).map((event) => event.recordId))];

  if (ids.length === 0) {
    return [];
  }
  const rows = await cases.find<{ id: string; personId: string | null; companyId: string | null; fsmLocationId: string | null }>(
    { id: { in: ids } },
    'id personId companyId fsmLocationId',
  );
  const candidates = rows.filter((row) =>
    operation === 'created'
      ? row.fsmLocationId === null && (row.personId !== null || row.companyId !== null)
      : row.personId === null
        ? row.companyId !== null && wroteCompany.has(row.id)
        : wrotePerson.has(row.id),
  );

  if (candidates.length === 0) {
    return [];
  }
  const first = await findMany<{ persons: PersonNode[]; locations: LocationNode[] }>({
    persons: { of: people, filter: { id: { in: candidates.map((row) => row.personId) } }, selection: 'id companyId serviceLocationId' },
    locations: {
      of: fsmLocations,
      filter: { id: { in: candidates.map((row) => row.fsmLocationId) } },
      selection: 'id partnerPersonId partnerCompanyId ownerPersonId ownerCompanyId',
    },
  });
  const knownPersons = new Set(first.persons.map((person) => person.id));
  const locationPersonIds = first.locations.flatMap((location) => [location.partnerPersonId, location.ownerPersonId]).flatMap((id) => id ?? []);
  const second = await findMany<{ persons: PersonNode[]; companies: { id: string; serviceLocationId: string | null }[] }>({
    persons: { of: people, filter: { id: { in: locationPersonIds.filter((id) => !knownPersons.has(id)) } }, selection: 'id companyId serviceLocationId' },
    companies: {
      of: companies,
      filter: { id: { in: [...first.persons.map((person) => person.companyId), ...candidates.map((row) => row.companyId)] } },
      selection: 'id serviceLocationId',
    },
  });
  const personById = new Map([...first.persons, ...second.persons].map((person) => [person.id, person]));
  const personCompanies = new Map([...personById.values()].map((person) => [person.id, person.companyId]));
  const companyById = new Map(second.companies.map((company) => [company.id, company]));
  const locationById = new Map(first.locations.map((location) => [location.id, location]));
  const errors = errorCollector();
  const set: string[] = [];

  for (const row of candidates) {
    await errors.run(row.id, async () => {
      const person = row.personId === null ? undefined : personById.get(row.personId);
      const company = row.companyId === null ? undefined : companyById.get(row.companyId);
      let partner: CaseLocationPartner | null = null;

      if (person !== undefined) {
        const commercial = person.companyId === null ? person.serviceLocationId : (companyById.get(person.companyId)?.serviceLocationId ?? null);

        partner = { commercialKey: personCommercialKey(person), serviceLocationId: person.serviceLocationId, commercialServiceLocationId: commercial };
      } else if (row.personId === null && row.companyId !== null) {
        partner = {
          commercialKey: companyCommercialKey(row.companyId),
          serviceLocationId: company?.serviceLocationId ?? null,
          commercialServiceLocationId: company?.serviceLocationId ?? null,
        };
      }
      const current = row.fsmLocationId === null ? undefined : locationById.get(row.fsmLocationId);
      const fsmLocationId = planCaseLocation({
        partner,
        currentLocationKey: current === undefined ? null : locationCommercialKey(current, personCompanies),
      });

      if (fsmLocationId !== null && fsmLocationId !== row.fsmLocationId) {
        await cases.update(row.id, { fsmLocationId });
        set.push(fsmLocationId);
      }
    });
  }
  errors.throwIfAny();

  return set;
};
