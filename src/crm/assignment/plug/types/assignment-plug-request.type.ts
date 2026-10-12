import { type AssignmentPlugLead } from 'src/crm/assignment/plug/types/assignment-plug-lead.type';
import { type AssignmentDoor } from 'src/crm/assignment/types/assignment-door.type';

export type AssignmentPlugRequest = {
  run: { door: AssignmentDoor; forceQuota: boolean; creationDeltaDays: number; delayHours: number; now: string };
  teams: {
    id: string;
    name: string | null;
    sequence: number;
    useLeads: boolean;
    useOpportunities: boolean;
    assignmentOptout: boolean;
    assignmentMax: number;
    assignmentDomain: unknown;
  }[];
  members: {
    id: string;
    teamId: string;
    workspaceMemberId: string;
    name: string | null;
    assignmentOptout: boolean;
    assignmentMax: number;
    quota: number;
    leadDayCount: number;
    assignmentDomain: unknown;
    assignmentDomainPreferred: unknown;
  }[];
  leads: AssignmentPlugLead[];
};
