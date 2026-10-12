import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';
import { twentyConvertApi } from 'src/crm/lead/actions/convert-api';
import { CONVERT_MESSAGES } from 'src/crm/lead/actions/convert-messages.constant';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { type ConvertOptions } from 'src/crm/lead/actions/types/convert-options.type';
import { planConvertDefaults } from 'src/crm/lead/actions/utils/plan-convert-defaults.util';
import { planCustomerRights } from 'src/crm/lead/actions/utils/plan-customer-rights.util';
import { type ConvertDefaultsInput } from 'src/crm/lead/actions/utils/types/convert-defaults-input.type';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { findLeadDuplicates } from 'src/crm/lead/merge/find-lead-duplicates';
import { planLeadMerge } from 'src/crm/lead/merge/utils/plan-lead-merge.util';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { normaliseEmail } from 'src/crm/lead/utils/email.util';
import { NOT_ALLOWED_MESSAGE } from 'src/shared/not-allowed';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { UserError } from 'src/shared/user-error';

export const optionalId = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : null);

export const optionalIds = (value: unknown) =>
  Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))] : [];

// Undefined when the dialog did not send the key: the default applies.
export const requestedId = (body: Record<string, unknown>, key: string) => (key in body ? optionalId(body[key]) : undefined);

// Only a pending lead converts; a lead at 100 % is closed.
export const refuseUnconvertible = (lead: LeadRow) => {
  if (lead.leadType !== LEAD_TYPE.LEAD) {
    throw new LeadActionError(CONVERT_MESSAGES.alreadyOpportunity);
  }
  if (lead.wonStatus !== WON_STATUS.PENDING) {
    throw new LeadActionError(CONVERT_MESSAGES.notPending);
  }
  if (lead.probability === 100) {
    throw new LeadActionError(CONVERT_MESSAGES.closed);
  }
};

// The dialog's values and the duplicates they find, read as the clicking user.
export const resolveConvertDefaults = async (lead: LeadRow, request: ConvertDefaultsInput['request']) => {
  const context = await loadLeadContext([]);
  const leadPerson = lead.personId === null ? null : await twentyConvertApi.readPerson(lead.personId);
  const email = normaliseEmail(lead.emailFrom?.primaryEmail ?? null);
  const personByEmail =
    lead.personId === null && lead.companyId === null && email !== null ? await twentyConvertApi.findPersonByEmail(email) : null;
  const chosenPerson =
    request.personId === undefined || request.personId === null ? null : await twentyConvertApi.readPerson(request.personId);
  const defaults = planConvertDefaults({
    lead,
    leadPerson,
    personByEmail,
    chosenPerson,
    request,
    teams: context.teams,
    memberships: context.memberships,
  });
  const duplicates = await findLeadDuplicates({
    email: defaults.duplicateSearch.email,
    personId: defaults.duplicateSearch.personId,
    companyId: defaults.duplicateSearch.companyId,
    includeLost: true,
    caller: 'person',
  });
  const person = [chosenPerson, leadPerson, personByEmail].find((candidate) => candidate !== null && candidate.id === defaults.personId);

  return { defaults, duplicates, stages: context.stages, person: person ?? null };
};

// The name the dialog shows for the company it will send, read as the user.
export const readCompanyLabel = async (companyId: string | null) => {
  if (companyId === null) {
    return null;
  }
  const found = requireData(
    await twentyGraphql<{ company: { name: string | null } | null }>(
      'person',
      `query ConvertCompanyLabel($id: UUID!) { company(filter: { id: { eq: $id } }) { name } }`,
      { id: companyId },
    ),
    'Read the company',
  );

  return found.company?.name ?? null;
};

// The lead a merge of these leads keeps, with the values the merge gives it.
export const planMergedHead = (leads: LeadRow[], stages: StageRow[]) => {
  const plan = planLeadMerge({ leads, stages });
  const head = leads.find((candidate) => candidate.id === plan.headId);

  return head === undefined ? null : { ...head, ...plan.data };
};

// Refuses when the conversion would make any of these leads a customer the
// user may not create.
export const requireCustomerRights = async (leads: LeadRow[], options: ConvertOptions) => {
  const needed = new Set<'person' | 'company'>();

  for (const lead of leads) {
    const email = normaliseEmail(lead.emailFrom?.primaryEmail ?? null);
    const personByEmail =
      options.customerAction === 'EACH_EXIST_OR_CREATE' && lead.personId === null && lead.companyId === null && email !== null
        ? await twentyConvertApi.findPersonByEmail(email)
        : null;

    planCustomerRights({
      lead,
      action: options.customerAction,
      chosenPersonId: options.personId,
      chosenCompanyId: options.companyId,
      personByEmailId: personByEmail?.id ?? null,
    }).forEach((object) => needed.add(object));
  }

  if (needed.size === 0) {
    return;
  }
  const updatable = await twentyConvertApi.updatableObjects();

  if ([...needed].some((object) => !updatable.has(object))) {
    throw new UserError(NOT_ALLOWED_MESSAGE);
  }
};
