import { duplicateEmailsOf } from 'src/crm/lead/merge/utils/lead-duplicates-filter.util';

type EmailLead = { id: string; emailFrom: { primaryEmail: string | null } | null };

// The leads of one search for many leads' addresses, split back per lead: each
// lead gets the found leads with one of its addresses, itself included.
export const groupEmailDuplicates = (leads: EmailLead[], found: EmailLead[]): Map<string, string[]> =>
  new Map(
    leads.map((lead) => {
      const emails = new Set(duplicateEmailsOf(lead.emailFrom?.primaryEmail ?? null));

      return [lead.id, emails.size === 0 ? [] : found.filter((other) => emails.has(other.emailFrom?.primaryEmail ?? '')).map((other) => other.id)];
    }),
  );
