import { type SlaCase } from 'src/helpdesk-sla/types/sla-case.type';
import { type SlaPolicy } from 'src/helpdesk-sla/types/sla-policy.type';
import { policyFilterMatches } from 'src/helpdesk-sla/utils/policy-filter-matches.util';

// A policy applies when each of its lists is empty or names the case's value; a case without tags or a
// category only gets policies that ask for none. An archived policy never applies.
export const matchingSlas = (slaCase: SlaCase, policies: SlaPolicy[]) =>
  policies.filter(
    (candidate) =>
      candidate.active &&
      (candidate.teamIds.length === 0 || (slaCase.teamId !== null && candidate.teamIds.includes(slaCase.teamId))) &&
      (slaCase.tagIds.length > 0
        ? candidate.tagIds.length === 0 || candidate.tagIds.some((tagId) => slaCase.tagIds.includes(tagId))
        : candidate.tagIds.length === 0) &&
      (slaCase.categoryId !== null
        ? candidate.categoryIds.length === 0 || candidate.categoryIds.includes(slaCase.categoryId)
        : candidate.categoryIds.length === 0) &&
      policyFilterMatches(candidate.domain, slaCase.filterRecord),
  );
