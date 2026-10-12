// What a lead assignment run reports: English source texts, translated in the
// language of the person who started the run.
export const ASSIGNMENT_MESSAGES = {
  noteTitle: 'Lead assignment',
  requestedBy: 'Lead assignment requested by {name}.',
  duplicatesMerged: '{count} duplicate leads were merged.',
  nothingNoCapacity: 'No lead was allocated to {team}: it has no capacity. Give its salespeople some capacity.',
  nothingNoMatch: 'No lead was allocated to {team} or its salespeople: no unassigned lead matches its filter.',
  nothingAnywhere: 'No lead was allocated to any team or salesperson. Check the sales teams, their salespeople and the unassigned leads.',
  noNewLeadTeam: 'No new lead was allocated to {team}: no unassigned lead matches its filter.',
  noNewLeadTeams: 'No new lead was allocated to the teams: no lead matches their filters.',
  allocatedTeam: '{count} leads were allocated to {team}.',
  allocatedTeams: '{count} leads were allocated among {teams} teams.',
  noneAssigned: 'No lead was assigned to a salesperson: no unassigned lead matches their filters.',
  assigned: '{count} leads were assigned among {members} salespeople.',
  teamFilterStopped: 'Lead assignment stopped: the filter of team {team} cannot be used. {reason}',
  memberFilterStopped: 'Lead assignment stopped: the filters of {member} in team {team} cannot be used. {reason}',
  plugFailed: 'The assignment plug failed: {reason}',
  plugAssigned: '{count} leads were assigned by the assignment plug.',
  noteFailed: 'The note on team {team} could not be written: {reason}',
  alreadyRunning: 'A lead assignment is already running. Try again in a moment.',
} as const;
