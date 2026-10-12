import { SCHEDULE_TEAM_FILTER, SETTINGS_DOOR_TEAM_FILTER } from 'src/crm/assignment/utils/door-team-filters.util';
import { records } from 'src/shared/triggers/records';

// Read with the app token: a run covers every team, whoever started it.
const teamIds = async (filter: Record<string, unknown>) =>
  (await records('crmTeam', 'crmTeams').find<{ id: string }>(filter, 'id')).map((team) => team.id);

export const readScheduleTeamIds = () => teamIds(SCHEDULE_TEAM_FILTER);
export const readSettingsDoorTeamIds = () => teamIds(SETTINGS_DOOR_TEAM_FILTER);
