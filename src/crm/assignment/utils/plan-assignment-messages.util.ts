import { ASSIGNMENT_MESSAGES } from 'src/crm/assignment/assignment-messages.constant';
import { type AssignmentMessage } from 'src/crm/assignment/types/assignment-message.type';

// What a manual run reports on its teams and to the person who started it.
export const planAssignmentMessages = ({
  teams,
  allocated,
  duplicates,
  members,
  membersAssigned,
}: {
  teams: { name: string; assignmentMax: number }[];
  allocated: number;
  duplicates: number;
  members: number;
  membersAssigned: number;
}): AssignmentMessage[] => {
  const messages: AssignmentMessage[] = [];
  const [onlyTeam] = teams.length === 1 ? teams : [];

  if (duplicates > 0) {
    messages.push({ message: ASSIGNMENT_MESSAGES.duplicatesMerged, values: { count: duplicates } });
  }
  if (allocated === 0 && membersAssigned === 0) {
    if (onlyTeam === undefined) {
      messages.push({ message: ASSIGNMENT_MESSAGES.nothingAnywhere });
    } else if (onlyTeam.assignmentMax === 0) {
      messages.push({ message: ASSIGNMENT_MESSAGES.nothingNoCapacity, values: { team: onlyTeam.name } });
    } else {
      messages.push({ message: ASSIGNMENT_MESSAGES.nothingNoMatch, values: { team: onlyTeam.name } });
    }
  }
  if (allocated === 0 && membersAssigned > 0) {
    messages.push(
      onlyTeam === undefined
        ? { message: ASSIGNMENT_MESSAGES.noNewLeadTeams }
        : { message: ASSIGNMENT_MESSAGES.noNewLeadTeam, values: { team: onlyTeam.name } },
    );
  } else if (allocated > 0) {
    messages.push(
      onlyTeam === undefined
        ? { message: ASSIGNMENT_MESSAGES.allocatedTeams, values: { count: allocated, teams: teams.length } }
        : { message: ASSIGNMENT_MESSAGES.allocatedTeam, values: { count: allocated, team: onlyTeam.name } },
    );
  }
  if (membersAssigned === 0 && allocated > 0) {
    messages.push({ message: ASSIGNMENT_MESSAGES.noneAssigned });
  } else if (membersAssigned > 0) {
    messages.push({ message: ASSIGNMENT_MESSAGES.assigned, values: { count: membersAssigned, members } });
  }
  return messages;
};
