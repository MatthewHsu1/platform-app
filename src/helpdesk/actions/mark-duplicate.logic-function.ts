import { defineLogicFunction } from 'twenty-sdk/define';

import { CaseActionError } from 'src/helpdesk/actions/case-action-error';
import { caseRouteHandler, findCaseAsUser, readCaseId, updateCaseAsUser } from 'src/helpdesk/actions/case-action-route';
import { HELPDESK_ACTION_MESSAGES } from 'src/helpdesk/actions/helpdesk-action-messages.constant';
import {
  MARK_DUPLICATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  MARK_DUPLICATE_ROUTE_PATH,
} from 'src/helpdesk/actions/helpdesk-actions-universal-identifiers.constant';
import { readHelpdeskSettings } from 'src/helpdesk/read-helpdesk-settings';
import { validateDuplicate } from 'src/helpdesk/utils/validate-duplicate.util';

const idOrNull = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : null);

// One save as the clicking user: the original, and the stage when one is chosen. The case trigger stamps the
// stage dates as for any stage change. The checks live here only: a direct edit of the original field is not
// checked.
const handler = caseRouteHandler(async (body) => {
  const caseId = readCaseId(body);

  if (caseId === null) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.selectOneCase, {}, 400);
  }
  if (!(await readHelpdeskSettings()).duplicateTracking) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.trackingOff);
  }
  if ((await findCaseAsUser(caseId)) === null) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.caseNotFound, {}, 404);
  }
  const originalId = idOrNull(body.originalId);
  const stageId = idOrNull(body.stageId);
  const original = originalId === null ? null : await findCaseAsUser(originalId);
  const refusal = validateDuplicate({
    caseId,
    original: original === null ? null : { id: original.id, duplicateId: original.duplicateId },
  });

  if (refusal !== null) {
    throw new CaseActionError(refusal);
  }
  await updateCaseAsUser(caseId, { duplicateId: originalId, ...(stageId === null ? {} : { stageId }) });

  return { caseId };
});

export default defineLogicFunction({
  universalIdentifier: MARK_DUPLICATE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'mark-work-case-duplicate',
  description: 'Marks a work case as a duplicate of another case and moves it to the chosen stage.',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: MARK_DUPLICATE_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
