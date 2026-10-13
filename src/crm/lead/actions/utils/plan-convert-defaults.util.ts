import { type ConvertDefaults } from 'src/crm/lead/actions/utils/types/convert-defaults.type';
import { type ConvertDefaultsInput } from 'src/crm/lead/actions/utils/types/convert-defaults-input.type';
import { defaultTeam } from 'src/sales-team/team/utils/default-team.util';

// The convert dialog's values, in the order the dialog fills them: customer
// action, contact, duplicates search, company, salesperson, team.
export const planConvertDefaults = ({
  lead,
  leadPerson,
  personByEmail,
  chosenPerson,
  request,
  teams,
  memberships,
}: ConvertDefaultsInput): ConvertDefaults => {
  // The lead's own customer comes first: its contact, else its company; only
  // a lead with neither looks for a contact by its email.
  const companyCustomer = lead.personId === null && lead.companyId !== null;
  const matching = leadPerson ?? (companyCustomer ? null : personByEmail);
  const customerAction = request.customerAction ?? (matching !== null || companyCustomer ? 'EXIST' : 'CREATE');
  const personId =
    customerAction === 'CREATE' ? null : request.personId !== undefined ? request.personId : (matching?.id ?? null);
  const person =
    personId === null ? null : chosenPerson?.id === personId ? chosenPerson : matching?.id === personId ? matching : null;
  const linksCompany = customerAction === 'EXIST' && personId === null && companyCustomer;
  const companyId =
    personId !== null
      ? (person?.companyId ?? request.companyId ?? null)
      : request.companyId !== undefined
        ? request.companyId
        : linksCompany
          ? lead.companyId
          : null;
  const salespersonId = request.salespersonId !== undefined ? request.salespersonId : lead.salespersonId;
  // Clearing the salesperson leaves the team as it is.
  const teamFor = (currentTeamId: string | null) =>
    salespersonId === null
      ? currentTeamId
      : defaultTeam({ salespersonId, leadType: null, currentTeamId, useTypeFilter: false, teams, memberships });
  const teamId =
    request.salespersonId !== undefined
      ? teamFor(request.teamId ?? null)
      : request.teamId !== undefined
        ? request.teamId
        : teamFor(null);
  const leadPersonEmail = leadPerson?.emails?.primaryEmail ?? '';
  const leadEmail = lead.emailFrom?.primaryEmail ?? '';

  return {
    customerAction,
    personId,
    companyId,
    duplicateSearch: {
      email: leadPersonEmail.length > 0 ? leadPersonEmail : leadEmail.length > 0 ? leadEmail : null,
      personId,
      companyId: linksCompany ? lead.companyId : null,
    },
    salespersonId,
    teamId,
  };
};
