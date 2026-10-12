import { ASSIGNMENT_ANSWER_MESSAGES } from 'src/crm/assignment/plug/assignment-answer-messages.constant';
import { type AssignmentPlugAnswer } from 'src/crm/assignment/plug/types/assignment-plug-answer.type';
import { type AssignmentPlugRequest } from 'src/crm/assignment/plug/types/assignment-plug-request.type';
import { PlugAnswerError } from 'src/shared/plug/plug-answer-error';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

// All or nothing: one wrong assignment rejects the whole answer, so Platform
// never applies half of a plugin's decision.
export const validateAssignmentAnswer = (answer: unknown, request: AssignmentPlugRequest): AssignmentPlugAnswer => {
  if (!isObject(answer) || !Array.isArray(answer.assignments)) {
    throw new PlugAnswerError(ASSIGNMENT_ANSWER_MESSAGES.noList);
  }
  const leadIds = new Set(request.leads.map((lead) => lead.id));
  const teamIds = new Set(request.teams.map((team) => team.id));
  const seen = new Set<string>();

  const assignments = answer.assignments.map((item: unknown, index: number) => {
    if (!isObject(item)) {
      throw new PlugAnswerError(ASSIGNMENT_ANSWER_MESSAGES.notObject, { position: index + 1 });
    }
    const leadId = String(item.leadId);
    const teamId = String(item.teamId);
    const salespersonId = item.salespersonId === undefined || item.salespersonId === null ? null : String(item.salespersonId);

    if (!leadIds.has(leadId)) {
      throw new PlugAnswerError(ASSIGNMENT_ANSWER_MESSAGES.unknownLead, { leadId });
    }
    if (seen.has(leadId)) {
      throw new PlugAnswerError(ASSIGNMENT_ANSWER_MESSAGES.leadTwice, { leadId });
    }
    seen.add(leadId);

    if (!teamIds.has(teamId)) {
      throw new PlugAnswerError(ASSIGNMENT_ANSWER_MESSAGES.unknownTeam, { teamId });
    }
    if (
      salespersonId !== null &&
      !request.members.some((member) => member.teamId === teamId && member.workspaceMemberId === salespersonId && !member.assignmentOptout)
    ) {
      throw new PlugAnswerError(ASSIGNMENT_ANSWER_MESSAGES.notMember, { salespersonId, teamId });
    }
    return { leadId, teamId, salespersonId };
  });

  return { assignments };
};
