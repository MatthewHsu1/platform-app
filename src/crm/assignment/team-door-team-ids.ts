import { ASSIGNMENT_ROUTE_MESSAGES } from 'src/crm/assignment/assignment-route-messages.constant';
import { translate } from 'src/shared/i18n/translate';

type DoorTeam = { useLeads: boolean | null; useOpportunities: boolean | null };

// The team the team button runs on. A team that uses neither leads nor a
// pipeline takes no assignment; an archived or opted-out team still does.
export const readTeamDoorTeamIds = async ({
  body,
  locale,
  findTeam,
}: {
  body: Record<string, unknown>;
  locale: string;
  findTeam: (teamId: string) => Promise<DoorTeam | null>;
}): Promise<{ teamIds: string[] } | { status: number; error: string }> => {
  const teamId = body.teamId;

  if (typeof teamId !== 'string' || teamId === '') {
    return { status: 400, error: translate(locale, ASSIGNMENT_ROUTE_MESSAGES.teamIdRequired) };
  }
  const team = await findTeam(teamId);

  if (team === null) {
    return { status: 404, error: translate(locale, ASSIGNMENT_ROUTE_MESSAGES.teamNotFound) };
  }
  if (team.useLeads !== true && team.useOpportunities !== true) {
    return { status: 409, error: translate(locale, ASSIGNMENT_ROUTE_MESSAGES.neitherLeadsNorPipeline) };
  }
  return { teamIds: [teamId] };
};
