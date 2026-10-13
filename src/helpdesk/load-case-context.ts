import { readHelpdeskSettings } from 'src/helpdesk/read-helpdesk-settings';
import { type CaseContext } from 'src/helpdesk/types/case-context.type';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';
import { findMany, records } from 'src/shared/triggers/records';
import { textOrNull } from 'src/shared/utils/text-or-null.util';

// Later modules add their fields to this one selection and nowhere else.
export const CASE_SELECTION = `id createdAt deletedAt number name description { markdown blocknote }
  assignedUserId stageId personId companyId partnerName partnerEmail { primaryEmail additionalEmails }
  teamId categoryId channel priority kanbanState duplicateId lastStageUpdate assignedDate closedDate
  unattended active ticketTypeId productId slaDeadline slaStateExpired updatedBy { source workspaceMemberId }`;

const text = (value: unknown) => (typeof value === 'string' ? textOrNull(value) : null);
const flag = (value: unknown) => (typeof value === 'boolean' ? value : null);
const objectOrNull = <TValue>(value: unknown) => (value !== null && typeof value === 'object' ? (value as TValue) : null);

// A case as a read or a database event holds it, with empty text read as null so the two agree.
export const readCaseRow = (node: Record<string, unknown>): CaseRow => ({
  id: String(node.id),
  createdAt: String(node.createdAt),
  deletedAt: text(node.deletedAt),
  number: text(node.number),
  name: text(node.name),
  description: objectOrNull(node.description),
  assignedUserId: text(node.assignedUserId),
  stageId: text(node.stageId),
  personId: text(node.personId),
  companyId: text(node.companyId),
  partnerName: text(node.partnerName),
  partnerEmail: objectOrNull(node.partnerEmail),
  teamId: text(node.teamId),
  categoryId: text(node.categoryId),
  channel: text(node.channel),
  priority: text(node.priority),
  kanbanState: text(node.kanbanState),
  duplicateId: text(node.duplicateId),
  lastStageUpdate: text(node.lastStageUpdate),
  assignedDate: text(node.assignedDate),
  closedDate: text(node.closedDate),
  unattended: flag(node.unattended),
  active: flag(node.active),
  ticketTypeId: text(node.ticketTypeId),
  productId: text(node.productId),
  slaDeadline: text(node.slaDeadline),
  slaStateExpired: flag(node.slaStateExpired),
  updatedBy: objectOrNull(node.updatedBy),
});

const stages = records('helpdeskTicketStage', 'helpdeskTicketStages');
const stageTeams = records('helpdeskTicketStageTeam', 'helpdeskTicketStageTeams');
const teams = records('helpdeskTicketTeam', 'helpdeskTicketTeams');
const members = records('helpdeskTicketTeamMember', 'helpdeskTicketTeamMembers');
const people = records('person', 'people');

type StageNode = {
  id: string;
  name: string | null;
  sequence: number | null;
  active: boolean | null;
  unattended: boolean | null;
  closed: boolean | null;
  fold: boolean | null;
  createdAt: string;
};
type TeamNode = {
  id: string;
  name: string | null;
  sequence: number | null;
  active: boolean | null;
  createdAt: string;
  parentId: string | null;
  useSla: boolean | null;
  resourceCalendarId: string | null;
};

// Everything a save rule reads besides the case: stages and teams (archived ones too, they
// are still real rows), who is in which team, and the company of each contact.
export const loadCaseContext = async (cases: CaseRow[]): Promise<CaseContext> => {
  const personIds = [...new Set(cases.flatMap((row) => (row.personId === null ? [] : [row.personId])))];
  const found = await findMany<{
    stages: StageNode[];
    stageTeams: { stageId: string; teamId: string }[];
    teams: TeamNode[];
    members: { teamId: string; workspaceMemberId: string }[];
    people: { id: string; companyId: string | null }[];
  }>({
    stages: { of: stages, filter: {}, selection: 'id name sequence active unattended closed fold createdAt' },
    stageTeams: { of: stageTeams, filter: {}, selection: 'stageId teamId' },
    teams: { of: teams, filter: {}, selection: 'id name sequence active createdAt parentId useSla resourceCalendarId' },
    members: { of: members, filter: {}, selection: 'teamId workspaceMemberId' },
    people: { of: people, filter: { id: { in: personIds } }, selection: 'id companyId' },
  });

  return {
    stages: found.stages.map((row) => ({
      id: row.id,
      name: row.name,
      sequence: row.sequence ?? 0,
      active: row.active !== false,
      unattended: row.unattended === true,
      closed: row.closed === true,
      fold: row.fold === true,
      createdAt: row.createdAt,
      teamIds: found.stageTeams.filter((link) => link.stageId === row.id).map((link) => link.teamId),
    })),
    teams: found.teams.map((row) => ({ ...row, sequence: row.sequence ?? 0, active: row.active !== false, useSla: row.useSla === true })),
    memberships: found.members,
    personCompanies: new Map(found.people.map((row) => [row.id, row.companyId])),
    settings: await readHelpdeskSettings(),
  };
};
