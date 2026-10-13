import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import { rebuildScoring } from 'src/crm/scoring/rebuild-scoring';
import { SCORING_MESSAGES } from 'src/crm/scoring/scoring-messages.constant';
import {
  UPDATE_PROBABILITIES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  UPDATE_PROBABILITIES_ROUTE_PATH,
} from 'src/crm/scoring/scoring-universal-identifiers.constant';
import { isScoringStartDate, safeScoringFields } from 'src/crm/scoring/utils/scoring-pairs.util';
import { isWorkspaceAdmin } from 'src/crm/settings/is-workspace-admin';
import { writeApplicationVariables } from 'src/crm/settings/write-application-variables';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { notAllowedResponse } from 'src/shared/not-allowed';
import { jsonResponse, readBody } from 'src/shared/route-response';
import { GraphqlForbiddenError } from 'src/shared/twenty-graphql';

// Stores the start date and the fields, then rebuilds the counts with them.
const handler = async (payload: RoutePayload) => {
  const locale = await readUserLocale().catch(() => 'en');

  try {
    if (!(await isWorkspaceAdmin())) {
      return jsonResponse(403, { error: translate(locale, SCORING_MESSAGES.onlyWorkspaceAdministrators) });
    }
    const body = readBody(payload);
    const startDate = typeof body.startDate === 'string' ? body.startDate : null;

    if (!isScoringStartDate(startDate)) {
      return jsonResponse(400, { error: translate(locale, SCORING_MESSAGES.startDateRequired) });
    }
    const fields = safeScoringFields(body.fields);

    await writeApplicationVariables({ CRM_PLS_START_DATE: startDate, CRM_PLS_FIELDS: fields });

    const outcome = await rebuildScoring({ plsStartDate: startDate, plsFields: fields });

    return outcome.kind === 'held'
      ? jsonResponse(409, { error: translate(locale, SCORING_MESSAGES.alreadyRunning) })
      : jsonResponse(200, outcome.result);
  } catch (error) {
    if (error instanceof GraphqlForbiddenError) {
      return notAllowedResponse(locale, error);
    }
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
  }
};

export default defineLogicFunction({
  universalIdentifier: UPDATE_PROBABILITIES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'update-lead-probabilities',
  description: 'Stores the scoring start date and fields, then counts every closed lead again and rescores the open ones.',
  timeoutSeconds: 900,
  handler,
  httpRouteTriggerSettings: { path: UPDATE_PROBABILITIES_ROUTE_PATH, httpMethod: 'POST', isAuthRequired: true },
});
