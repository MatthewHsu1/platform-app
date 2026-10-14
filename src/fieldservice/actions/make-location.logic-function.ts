import { defineLogicFunction } from 'twenty-sdk/define';

import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import {
  createAsUser,
  fieldserviceRouteHandler,
  findAsUser,
  readRecordId,
  requireFieldServiceLevel,
} from 'src/fieldservice/actions/fieldservice-action-route';
import { type PartnerForLocation } from 'src/fieldservice/actions/types/partner-for-location.type';
import { planMakeLocation } from 'src/fieldservice/actions/utils/plan-make-location.util';
import { fsmLocations } from 'src/fieldservice/fieldservice-records';
import { FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS, MAKE_LOCATION_ROUTE_PATH } from 'src/fieldservice/fieldservice-universal-identifiers.constant';

type PersonNode = {
  id: string;
  name: { firstName: string | null; lastName: string | null } | null;
  companyId: string | null;
  emails: unknown;
  phones: unknown;
};

type CompanyNode = { id: string; name: string | null; address: unknown };

const PERSON_SELECTION =
  'id name { firstName lastName } companyId emails { primaryEmail additionalEmails } phones { primaryPhoneNumber primaryPhoneCountryCode primaryPhoneCallingCode additionalPhones }';
const COMPANY_SELECTION =
  'id name address { addressStreet1 addressStreet2 addressCity addressState addressPostcode addressCountry addressLat addressLng }';

// Reads the contact or company as the clicking user.
const readPartner = async (kind: 'person' | 'company', id: string): Promise<PartnerForLocation | null> => {
  if (kind === 'company') {
    const company = await findAsUser<CompanyNode>('company', 'companies', id, COMPANY_SELECTION);

    return company === null ? null : { kind, id, name: company.name ?? '', address: company.address };
  }
  const person = await findAsUser<PersonNode>('person', 'people', id, PERSON_SELECTION);

  return person === null
    ? null
    : {
        kind,
        id,
        name: [person.name?.firstName, person.name?.lastName].filter((part) => part !== null && part !== undefined && part !== '').join(' '),
        companyId: person.companyId,
        emails: person.emails,
        phones: person.phones,
      };
};

// The location is made as the clicking user, so their rights apply and the location rules fill its full name.
const handler = fieldserviceRouteHandler(async (body) => {
  const partnerId = readRecordId(body);
  const kind = body.kind === 'company' ? 'company' : 'person';

  await requireFieldServiceLevel('fieldService.dispatcher');
  const partner = await readPartner(kind, partnerId);

  if (partner === null) {
    throw new FieldserviceActionError(FIELDSERVICE_ACTION_MESSAGES.partnerNotFound, {}, 404);
  }
  const partnerField = kind === 'company' ? 'partnerCompanyId' : 'partnerPersonId';
  const existing = await fsmLocations.find<{ id: string }>({ [partnerField]: { eq: partnerId } }, 'id');
  const companyId = partner.kind === 'person' ? partner.companyId : null;
  const companyLocations =
    companyId === null ? [] : await fsmLocations.find<{ id: string; createdAt: string }>({ partnerCompanyId: { eq: companyId } }, 'id createdAt');
  const [companyLocation] = companyLocations.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  const plan = planMakeLocation({ partner, hasLocation: existing.length > 0, companyLocationId: companyLocation?.id ?? null });

  if (plan.kind === 'refuse') {
    throw new FieldserviceActionError(plan.reason);
  }
  const location = await createAsUser('fsmLocation', plan.data);

  return { locationId: location.id };
});

export default defineLogicFunction({
  universalIdentifier: FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.makeLocationLogicFunction,
  name: 'make-service-location',
  description: 'Makes a service location from a contact or a company, owned by the company of the contact or by the partner itself.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: { path: MAKE_LOCATION_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
