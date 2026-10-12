import { assignLeads } from 'src/crm/assignment/assign-leads';
import { ASSIGNMENT_ROUTE_MESSAGES } from 'src/crm/assignment/assignment-route-messages.constant';
import { type AssignmentDoor } from 'src/crm/assignment/types/assignment-door.type';
import { isSalesAdministrator } from 'src/crm/settings/is-sales-administrator';
import { readSignedInMember } from 'src/shared/current-member';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { notAllowedResponse } from 'src/shared/not-allowed';
import { jsonResponse } from 'src/shared/route-response';
import { GraphqlForbiddenError } from 'src/shared/twenty-graphql';

// A manual run: managers only, full daily quotas, leads of any age. A request
// with nobody signed in (an API key) is refused like any non-manager. A run
// that stopped, found another run going or skipped on a failed plug answers as
// a refusal.
export const runManualAssignment = async ({
  door,
  readTeamIds,
}: {
  door: Exclude<AssignmentDoor, 'SCHEDULE'>;
  readTeamIds: (locale: string) => Promise<{ teamIds: string[] } | { status: number; error: string }>;
}) => {
  const locale = await readUserLocale().catch(() => 'en');

  try {
    const member = await readSignedInMember();

    if (member === null || !(await isSalesAdministrator())) {
      return jsonResponse(403, { error: translate(locale, ASSIGNMENT_ROUTE_MESSAGES.onlySalesAdministrators) });
    }
    const teams = await readTeamIds(locale);

    if ('error' in teams) {
      return jsonResponse(teams.status, { error: teams.error });
    }
    const result = await assignLeads({
      teamIds: teams.teamIds,
      forceQuota: true,
      creationDeltaDays: 0,
      door,
      requestedBy: member.name,
      locale,
    });

    return result.errors.length > 0
      ? jsonResponse(409, { error: result.messages.join(' ') })
      : jsonResponse(200, { message: result.messages.join(' ') });
  } catch (error) {
    if (error instanceof GraphqlForbiddenError) {
      return notAllowedResponse(locale, error);
    }
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
  }
};
