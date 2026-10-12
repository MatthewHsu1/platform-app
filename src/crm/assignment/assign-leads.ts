import { ASSIGNMENT_MESSAGES } from 'src/crm/assignment/assignment-messages.constant';
import { makeAssignmentApi } from 'src/crm/assignment/assignment-api';
import { makeAssignLeads } from 'src/crm/assignment/run-assignment';
import { type AssignLeadsInput } from 'src/crm/assignment/types/assign-leads-input.type';
import { type AssignmentResult } from 'src/crm/assignment/types/assignment-result.type';
import { claimKey, withClaim } from 'src/shared/claims/claim';
import { translate } from 'src/shared/i18n/translate';

const ASSIGNMENT_CLAIM_KEY = claimKey('crmLeadAssignment', 'all');

// One run at a time, whichever door started it: two runs could each merge the
// same duplicates or hand out the same team's quota twice. `onStart` runs only
// when this run holds the claim, before any lead moves.
export const assignLeads = async (
  input: AssignLeadsInput,
  { onStart }: { onStart?: () => Promise<void> } = {},
): Promise<AssignmentResult> => {
  const locale = input.locale ?? 'en';
  const outcome = await withClaim(ASSIGNMENT_CLAIM_KEY, async () => {
    await onStart?.();

    return makeAssignLeads(makeAssignmentApi(locale))(input);
  });

  if (outcome.kind === 'done') {
    return outcome.result;
  }
  const message = translate(locale, ASSIGNMENT_MESSAGES.alreadyRunning);

  return { teams: {}, members: {}, errors: [message], messages: [message], plugError: null, plug: null };
};
