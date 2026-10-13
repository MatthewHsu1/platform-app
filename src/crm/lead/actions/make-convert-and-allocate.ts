import { WON_STATUS } from 'src/crm/crm-options.constant';
import { CONVERT_MESSAGES } from 'src/crm/lead/actions/convert-messages.constant';
import { type ConvertApi } from 'src/crm/lead/actions/types/convert-api.type';
import { type ConvertOptions } from 'src/crm/lead/actions/types/convert-options.type';
import { planAllocation, planConversion, planConvertSave } from 'src/crm/lead/actions/utils/plan-conversion.util';
import { planCreateCustomer, planCustomerCompany } from 'src/crm/lead/actions/utils/plan-create-customer.util';
import { planCustomerTarget } from 'src/crm/lead/actions/utils/plan-customer-target.util';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { normaliseEmail } from 'src/crm/lead/utils/email.util';
import { translate } from 'src/shared/i18n/translate';
import { NOT_ALLOWED_MESSAGE } from 'src/shared/not-allowed';
import { UserError } from 'src/shared/user-error';
import { derivedId } from 'src/shared/utils/derived-id.util';

type Customer = { personId: string | null; companyId: string | null };

// Each lead is finished (customer, conversion, salesperson) before the next
// one starts. The contacts, companies and notes a run makes have ids derived
// from the lead (and the run, for a company), so a run started again after a
// stop finds them instead of making a second set; the lead itself is planned
// again from what it now holds.
export const makeConvertAndAllocate = (api: ConvertApi) => async (leads: LeadRow[], options: ConvertOptions) => {
  const updatable = await api.updatableObjects();
  const requireRight = (object: 'crmLead' | 'person' | 'company') => {
    if (!updatable.has(object)) {
      throw new UserError(NOT_ALLOWED_MESSAGE);
    }
  };

  requireRight('crmLead');

  const { stages, teams, memberships } = await api.readStagesAndTeams();
  const allocation = planAllocation({
    leads,
    salespersonIds: options.salespersonIds,
    teamId: options.teamId,
    force: options.force,
  });
  const now = api.now();
  const locale = await api.readLocale();

  // A value Twenty keeps unique is held by another record: the record is made
  // without it, after a note on the lead says so.
  const ensureRecord = async ({
    exists,
    create,
    createWithoutUnique,
    clashNote,
    leadId,
  }: {
    exists: boolean;
    create: () => Promise<'created' | 'taken'>;
    createWithoutUnique: (() => Promise<'created' | 'taken'>) | null;
    clashNote: { id: string; title: string; body: string };
    leadId: string;
  }) => {
    if (exists || (await create()) === 'created') {
      return;
    }
    if (createWithoutUnique === null) {
      throw new Error(`Could not create the customer of lead ${leadId}: a unique value is taken.`);
    }
    await api.addNote({ ...clashNote, objectSingular: 'crmLead', recordId: leadId });
    if ((await createWithoutUnique()) !== 'created') {
      throw new Error(`Could not create the customer of lead ${leadId}: a unique value is taken.`);
    }
  };

  const createCustomer = async (lead: LeadRow): Promise<Customer> => {
    const newCompanyId = derivedId('convertCompany', options.runId, lead.id);
    // A lead converts once, so its new contact is found again even from a dialog opened anew.
    const newPersonId = derivedId('convertPerson', lead.id);
    const partnerName = lead.partnerName?.trim() ?? '';
    // A company this run already made for the lead is found by its id, before any other of the same name.
    const companyMade = await api.recordExists('company', newCompanyId);
    const companyIdByName =
      companyMade || options.companyId !== null || partnerName.length === 0 ? null : await api.findCompanyIdByExactName(partnerName);
    const companyTarget = planCustomerCompany({ lead, chosenCompanyId: options.companyId, companyIdByName });
    const existingCompanyId = companyTarget !== null && 'id' in companyTarget ? companyTarget.id : null;
    const plan = planCreateCustomer({
      lead,
      chosenCompanyId: options.companyId,
      companyIdByName,
      existingCompanyAddress: existingCompanyId === null ? null : await api.readCompanyAddress(existingCompanyId),
      salespersonId: options.salespersonIds[0] ?? null,
    });

    if (plan.company !== null && 'create' in plan.company) {
      requireRight('company');
    }
    if (plan.person !== null) {
      requireRight('person');
    }

    const notesBody = lead.description?.markdown?.trim() ?? '';
    const notesTitle = translate(locale, CONVERT_MESSAGES.notesTitle, { name: lead.name ?? '' });
    const addLeadNotes = async (objectSingular: 'person' | 'company', recordId: string) => {
      if (notesBody.length > 0) {
        await api.addNote({ id: derivedId('convertNotes', recordId), objectSingular, recordId, title: notesTitle, body: notesBody });
      }
    };
    let companyId: string | null = null;

    if (plan.company !== null && 'id' in plan.company) {
      companyId = plan.company.id;
    } else if (plan.company !== null) {
      const input = plan.company.create;
      const { domainName, ...withoutWebsite } = input;

      await ensureRecord({
        exists: companyMade,
        create: () => api.createCompany(newCompanyId, input),
        createWithoutUnique: domainName === undefined ? null : () => api.createCompany(newCompanyId, withoutWebsite),
        clashNote: {
          id: derivedId('convertWebsiteTaken', newCompanyId),
          title: translate(locale, CONVERT_MESSAGES.websiteTakenTitle),
          body: translate(locale, CONVERT_MESSAGES.websiteTakenBody, { website: domainName?.primaryLinkUrl ?? '' }),
        },
        leadId: lead.id,
      });
      await addLeadNotes('company', newCompanyId);
      companyId = newCompanyId;
    }

    if (plan.person === null) {
      return { personId: null, companyId };
    }

    const input = { ...plan.person.create, companyId };
    const { emails, ...withoutEmail } = input;

    await ensureRecord({
      exists: await api.recordExists('person', newPersonId),
      create: () => api.createPerson(newPersonId, input),
      createWithoutUnique: emails === undefined ? null : () => api.createPerson(newPersonId, withoutEmail),
      clashNote: {
        id: derivedId('convertEmailTaken', newPersonId),
        title: translate(locale, CONVERT_MESSAGES.emailTakenTitle),
        body: translate(locale, CONVERT_MESSAGES.emailTakenBody, { email: emails?.primaryEmail ?? '' }),
      },
      leadId: lead.id,
    });
    await addLeadNotes('person', newPersonId);

    return { personId: newPersonId, companyId };
  };

  const customerOf = async (lead: LeadRow): Promise<Customer> => {
    const kept = { personId: lead.personId, companyId: lead.companyId };

    if (lead.wonStatus === WON_STATUS.LOST) {
      return kept;
    }

    const email = normaliseEmail(lead.emailFrom?.primaryEmail ?? null);
    const personByEmail =
      options.customerAction === 'EACH_EXIST_OR_CREATE' && lead.personId === null && lead.companyId === null && email !== null
        ? await api.findPersonByEmail(email)
        : null;
    const target = planCustomerTarget({
      lead,
      action: options.customerAction,
      chosenPersonId: options.personId,
      personByEmailId: personByEmail?.id ?? null,
    });

    switch (target.kind) {
      case 'person': {
        const person = personByEmail?.id === target.personId ? personByEmail : await api.readPerson(target.personId);

        return { personId: target.personId, companyId: person?.companyId ?? lead.companyId };
      }
      case 'create':
        return createCustomer(lead);
      default:
        return kept;
    }
  };

  for (const lead of leads) {
    const customer = await customerOf(lead);
    // A won lead is not converted, but its customer is still set.
    const data =
      lead.wonStatus === WON_STATUS.WON
        ? {
            ...(customer.personId !== lead.personId && { personId: customer.personId }),
            ...(customer.companyId !== lead.companyId && { companyId: customer.companyId }),
          }
        : planConversion({ lead, customer, stages, now });
    const save = planConvertSave({ lead, conversion: data, allocated: allocation.get(lead.id), stages, teams, memberships });

    if (Object.keys(save).length > 0) {
      await api.updateLead(lead.id, save);
    }
  }
};
