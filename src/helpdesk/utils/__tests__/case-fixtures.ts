import { type CaseContext } from 'src/helpdesk/types/case-context.type';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';
import { type CaseStageRow } from 'src/helpdesk/types/case-stage-row.type';

export const at = (minute: number) => `2026-10-09T08:${String(minute).padStart(2, '0')}:00.000Z`;
export const NOW = '2026-10-09T12:00:00.000Z';

export const stage = (id: string, sequence: number, extra: Partial<CaseStageRow> = {}, created = sequence): CaseStageRow => ({
  id, name: id, sequence, active: true, unattended: false, closed: false, fold: false, createdAt: at(created), teamIds: [], ...extra,
});

export const DEFAULT_STAGES: CaseStageRow[] = [
  stage('new', 1, { unattended: true }),
  stage('inProgress', 2),
  stage('awaiting', 3),
  stage('done', 4, { closed: true, fold: true }),
  stage('cancelled', 5, { closed: true, fold: true }),
  stage('rejected', 6, { closed: true, fold: true }),
];

export const context = (extra: Partial<CaseContext> = {}): CaseContext => ({
  stages: DEFAULT_STAGES,
  teams: [
    { id: 'teamA', name: 'Team A', sequence: 10, active: true, createdAt: at(1), parentId: null },
    { id: 'teamB', name: 'Team B', sequence: 10, active: true, createdAt: at(2), parentId: null },
  ],
  memberships: [
    { teamId: 'teamA', workspaceMemberId: 'userOwn' },
    { teamId: 'teamA', workspaceMemberId: 'user' },
    { teamId: 'teamB', workspaceMemberId: 'userTeam' },
  ],
  personCompanies: new Map([['jill', 'acme'], ['bob', null]]),
  settings: { autoAssign: true, duplicateTracking: false, duplicateStageId: null },
  ...extra,
});

export const caseRow = (extra: Partial<CaseRow> = {}): CaseRow => ({
  id: 'case1', createdAt: at(30), deletedAt: null, number: '/', name: 'New Ticket',
  description: { markdown: 'Description', blocknote: null },
  assignedUserId: null, stageId: null, personId: null, companyId: null, partnerName: null, partnerEmail: null,
  teamId: null, categoryId: null, channel: null, priority: 'MEDIUM', kanbanState: 'NORMAL', duplicateId: null,
  lastStageUpdate: null, assignedDate: null, closedDate: null, unattended: false, active: true,
  updatedBy: { source: 'MANUAL', workspaceMemberId: 'userOwn' },
  ...extra,
});
