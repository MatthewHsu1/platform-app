import { findStandardCalendarId } from 'src/resource/load-calendars';
import { records } from 'src/shared/triggers/records';

const teams = records('helpdeskTicketTeam', 'helpdeskTicketTeams');

// A new team works on the company's standard hours until someone picks others.
export const applyTeamCalendarDefault = async (teamIds: string[]) => {
  if (teamIds.length === 0) {
    return;
  }
  const empty = await teams.find<{ id: string }>({ id: { in: teamIds }, resourceCalendarId: { is: 'NULL' } }, 'id');
  const calendarId = empty.length === 0 ? null : await findStandardCalendarId();

  if (calendarId !== null) {
    await teams.updateMany(
      empty.map((team) => team.id),
      { resourceCalendarId: calendarId },
    );
  }
};
