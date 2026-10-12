// Why a lead assignment plug's answer is refused. English source texts; the
// run translates them in the reader's language.
export const ASSIGNMENT_ANSWER_MESSAGES = {
  noList: 'The answer has no list of assignments.',
  notObject: 'Assignment {position} is not an object.',
  unknownLead: 'Lead {leadId} was not in the request.',
  leadTwice: 'Lead {leadId} is assigned twice.',
  unknownTeam: 'Team {teamId} was not in the request.',
  notMember: 'Salesperson {salespersonId} is not a member of team {teamId} who takes leads.',
} as const;
