import { normaliseEmail, splitEmails } from 'src/crm/lead/utils/email.util';
import { FREE_MAIL_DOMAINS } from 'src/crm/lead/utils/free-mail-domains.constant';

// What two leads share when they come from the same company: the domain of a
// company address, or the whole address at a free-mail provider.
export const emailDomainCriterion = (email: string | null) => {
  if (email === null || email.length === 0) {
    return null;
  }

  const [first] = splitEmails(email);
  const toCheck = (first === undefined ? null : normaliseEmail(first.email)) ?? email.toLowerCase();
  const at = toCheck.lastIndexOf('@');

  if (at === -1) {
    return toCheck;
  }

  const domain = toCheck.slice(at + 1);

  return FREE_MAIL_DOMAINS.has(domain) ? toCheck : `@${domain}`;
};
