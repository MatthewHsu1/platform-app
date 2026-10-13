import { PHONE_STATE } from 'src/crm/crm-options.constant';
import { type SimilarLeadQueries } from 'src/crm/lead/actions/utils/types/similar-lead-queries.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { emailDomainCriterion } from 'src/crm/lead/utils/email-domain-criterion.util';
import { normaliseEmail } from 'src/crm/lead/utils/email.util';
import { phoneState } from 'src/crm/lead/utils/phone.util';
import { escapeLike } from 'src/shared/utils/escape-like.util';

const RELEVANT_LIMIT = 21;

// Read one more lead than a relevant criterion may find, to tell whether it found too many.
export const SIMILAR_LEADS_PAGE = RELEVANT_LIMIT;

// A criterion that finds this many leads says nothing about this one; it is dropped.
export const keepIfRelevant = <TRow>(rows: TRow[]) => (rows.length < RELEVANT_LIMIT ? rows : []);

export const planSimilarLeadQueries = ({
  lead,
  person,
}: {
  lead: LeadRow;
  person: { id: string; companyId: string | null } | null;
}): SimilarLeadQueries => {
  const notSelf = { id: { neq: lead.id } };
  const normalised = normaliseEmail(lead.emailFrom?.primaryEmail ?? null);
  const criterion = normalised === null ? null : emailDomainCriterion(normalised);
  // Compared without case, as addresses are.
  const email =
    criterion === null
      ? null
      : {
          and: [
            notSelf,
            {
              emailFrom: {
                primaryEmail: { ilike: criterion.startsWith('@') ? `%${escapeLike(criterion)}` : escapeLike(criterion) },
              },
            },
          ],
        };

  // The customer is the contact if there is one, else the company; its
  // commercial entity is the contact's company, else the contact itself.
  const commercial: SimilarLeadQueries['commercial'] =
    lead.personId !== null
      ? person === null
        ? null
        : person.companyId !== null
          ? { kind: 'company', companyId: person.companyId }
          : { kind: 'person', filter: { and: [notSelf, { personId: { eq: person.id } }] } }
      : lead.companyId !== null
        ? { kind: 'company', companyId: lead.companyId }
        : null;

  // Only a valid number says the leads share a phone.
  const number = lead.phone?.primaryPhoneNumber ?? '';
  const phone =
    phoneState(lead.phone) !== PHONE_STATE.CORRECT
      ? null
      : {
          and: [
            notSelf,
            {
              phone: {
                primaryPhoneNumber: { eq: number },
                primaryPhoneCallingCode: { eq: lead.phone?.primaryPhoneCallingCode ?? '' },
              },
            },
          ],
        };

  return { email, commercial, phone };
};

// Leads whose customer is the company or one of its people: a lead with a
// contact belongs to its contact, a lead without one to its company.
export const similarCompanyFilter = ({ leadId, companyId, peopleIds }: { leadId: string; companyId: string; peopleIds: string[] }) => ({
  and: [
    { id: { neq: leadId } },
    { or: [{ personId: { in: peopleIds } }, { and: [{ personId: { is: 'NULL' } }, { companyId: { eq: companyId } }] }] },
  ],
});
