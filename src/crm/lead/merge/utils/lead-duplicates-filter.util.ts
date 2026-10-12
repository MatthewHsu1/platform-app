import { LEAD_TYPE, WON_STATUS } from 'src/crm/crm-options.constant';
import { normaliseEmail, splitEmails } from 'src/crm/lead/utils/email.util';

// Leads that look like the same deal: one of the email addresses, or the same
// customer. A customer is the contact when there is one, else the company, so
// a company matches only leads that have no contact.
export const leadDuplicatesFilter = ({
  email,
  personId,
  companyId,
  includeLost,
}: {
  email: string | null;
  personId: string | null;
  companyId: string | null;
  includeLost: boolean;
}): Record<string, unknown> | null => {
  const emails = [
    ...new Set(
      splitEmails(email)
        .map((pair) => normaliseEmail(pair.email))
        .filter((address): address is string => address !== null),
    ),
  ];
  const matches: Record<string, unknown>[] = [];

  if (emails.length > 0) {
    matches.push({ emailFrom: { primaryEmail: { in: emails } } });
  }
  if (personId !== null) {
    matches.push({ personId: { eq: personId } });
  } else if (companyId !== null) {
    matches.push({ and: [{ personId: { is: 'NULL' } }, { companyId: { eq: companyId } }] });
  }

  if (matches.length === 0) {
    return null;
  }

  // Lost opportunities may come along, lost leads never; won ones never.
  const status = includeLost
    ? [
        { wonStatus: { neq: WON_STATUS.WON } },
        { or: [{ leadType: { eq: LEAD_TYPE.OPPORTUNITY } }, { wonStatus: { neq: WON_STATUS.LOST } }] },
      ]
    : [{ wonStatus: { eq: WON_STATUS.PENDING } }];

  return { and: [{ or: matches }, ...status] };
};
