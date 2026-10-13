import { type TodoCounts } from 'src/helpdesk/types/todo-counts.type';
import { countTodo } from 'src/helpdesk/utils/count-todo.util';
import { findMany, records } from 'src/shared/triggers/records';

const teams = records('helpdeskTicketTeam', 'helpdeskTicketTeams');
const cases = records('helpdeskTicket', 'helpdeskTickets');
const stages = records('helpdeskTicketStage', 'helpdeskTicketStages');

const COUNT_FIELDS: (keyof TodoCounts)[] = [
  'todoTicketCount',
  'todoTicketCountUnassigned',
  'todoTicketCountUnattended',
  'todoTicketCountHighPriority',
];

type CountedNode = {
  teamId: string | null;
  assignedUserId: string | null;
  unattended: boolean | null;
  priority: string | null;
  stageId: string | null;
  active: boolean | null;
};

// The one writer of a team's four to-do counts. It writes only the counts that differ.
export const recomputeTeamCounts = async (teamIds: string[]) => {
  const ids = [...new Set(teamIds)];

  if (ids.length === 0) {
    return;
  }
  const found = await findMany<{
    teams: ({ id: string } & TodoCounts)[];
    cases: CountedNode[];
    stages: { id: string; closed: boolean | null }[];
  }>({
    teams: { of: teams, filter: { id: { in: ids } }, selection: `id ${COUNT_FIELDS.join(' ')}` },
    cases: {
      of: cases,
      filter: { teamId: { in: ids }, active: { eq: true } },
      selection: 'teamId assignedUserId unattended priority stageId active',
    },
    stages: { of: stages, filter: {}, selection: 'id closed' },
  });
  const closed = new Set(found.stages.filter((row) => row.closed === true).map((row) => row.id));
  const counted = found.cases.map((row) => ({ ...row, stageClosed: row.stageId !== null && closed.has(row.stageId) }));

  for (const team of found.teams) {
    const counts = countTodo(counted, team.id);
    const changed = Object.fromEntries(COUNT_FIELDS.filter((field) => team[field] !== counts[field]).map((field) => [field, counts[field]]));

    if (Object.keys(changed).length > 0) {
      await teams.update(team.id, changed);
    }
  }
};
