import { CASE_SELECTION, readCaseRow } from 'src/helpdesk/load-case-context';
import { caseFilterRecord } from 'src/helpdesk-sla/case-filter-catalogue';
import {
  helpdeskSlaCategories,
  helpdeskSlaIgnoreStages,
  helpdeskSlas,
  helpdeskSlaTags,
  helpdeskSlaTeams,
  helpdeskTicketSlas,
} from 'src/helpdesk-sla/sla-records';
import { type SlaApi } from 'src/helpdesk-sla/types/sla-api.type';
import { type SlaPolicy } from 'src/helpdesk-sla/types/sla-policy.type';
import { type SlaRow } from 'src/helpdesk-sla/types/sla-row.type';
import { loadCalendars } from 'src/resource/load-calendars';
import { backoffMs } from 'src/shared/backoff';
import { CLAIM_HELD_MESSAGE, claimKey, withClaim } from 'src/shared/claims/claim';
import { findMany, records } from 'src/shared/triggers/records';
import { retryOnConflict } from 'src/shared/triggers/retry-on-conflict';

const cases = records('helpdeskTicket', 'helpdeskTickets');
const teams = records('helpdeskTicketTeam', 'helpdeskTicketTeams');
const stages = records('helpdeskTicketStage', 'helpdeskTicketStages');
const tagLinks = records('helpdeskTicketTagRel', 'helpdeskTicketTagRels');

const CLAIM_ATTEMPTS = 10;
const ROW_SELECTION = 'id ticketId slaId name deadline hours expectedStageId consumedTime lastStateDate state';

type RowNode = {
  id: string;
  ticketId: string;
  slaId: string;
  name: string | null;
  deadline: string | null;
  hours: number | null;
  expectedStageId: string | null;
  consumedTime: number | null;
  lastStateDate: string | null;
  state: string | null;
};

const toRow = (node: RowNode): SlaRow => ({
  id: node.id,
  ticketId: node.ticketId,
  slaId: node.slaId,
  name: node.name,
  deadline: node.deadline,
  hours: node.hours ?? 0,
  expectedStageId: node.expectedStageId,
  consumedTime: node.consumedTime ?? 0,
  lastStateDate: node.lastStateDate,
  state: node.state ?? '',
});

// Everything is read and written with the app token. A case's rows are written by one run at a time, under
// the claim `caseSla:<case id>`: a run that finds it held waits and tries again.
export const TWENTY_SLA_API: SlaApi = {
  readCases: async (ids) => {
    if (ids.length === 0) {
      return [];
    }
    const found = (await cases.find<Record<string, unknown>>({ id: { in: ids } }, CASE_SELECTION)).map(readCaseRow);
    const links = await tagLinks.find<{ ticketId: string; tagId: string }>({ ticketId: { in: ids } }, 'ticketId tagId');

    return found.map((row) => {
      const tagIds = links.filter((link) => link.ticketId === row.id).map((link) => link.tagId);

      return {
        id: row.id,
        createdAt: row.createdAt,
        teamId: row.teamId,
        categoryId: row.categoryId,
        tagIds,
        stageId: row.stageId,
        filterRecord: caseFilterRecord(row, tagIds),
      };
    });
  },
  readTeams: async (ids) =>
    ids.length === 0
      ? []
      : (await teams.find<{ id: string; useSla: boolean | null; resourceCalendarId: string | null }>({ id: { in: ids } }, 'id useSla resourceCalendarId')).map(
          (team) => ({ id: team.id, useSla: team.useSla === true, resourceCalendarId: team.resourceCalendarId }),
        ),
  readPolicies: async () => {
    const found = await findMany<{
      policies: { id: string; name: string | null; active: boolean | null; stageId: string | null; days: number | null; hours: number | null; domain: string | null }[];
      teamLinks: { slaId: string; teamId: string }[];
      categoryLinks: { slaId: string; categoryId: string }[];
      tagLinks: { slaId: string; tagId: string }[];
      ignoreLinks: { slaId: string; stageId: string }[];
    }>({
      policies: { of: helpdeskSlas, filter: {}, selection: 'id name active stageId days hours domain' },
      teamLinks: { of: helpdeskSlaTeams, filter: {}, selection: 'slaId teamId' },
      categoryLinks: { of: helpdeskSlaCategories, filter: {}, selection: 'slaId categoryId' },
      tagLinks: { of: helpdeskSlaTags, filter: {}, selection: 'slaId tagId' },
      ignoreLinks: { of: helpdeskSlaIgnoreStages, filter: {}, selection: 'slaId stageId' },
    });

    return found.policies.map(
      (policy): SlaPolicy => ({
        id: policy.id,
        name: policy.name,
        active: policy.active !== false,
        stageId: policy.stageId,
        days: policy.days ?? 0,
        hours: policy.hours ?? 0,
        domain: policy.domain,
        teamIds: found.teamLinks.filter((link) => link.slaId === policy.id).map((link) => link.teamId),
        categoryIds: found.categoryLinks.filter((link) => link.slaId === policy.id).map((link) => link.categoryId),
        tagIds: found.tagLinks.filter((link) => link.slaId === policy.id).map((link) => link.tagId),
        ignoreStageIds: found.ignoreLinks.filter((link) => link.slaId === policy.id).map((link) => link.stageId),
      }),
    );
  },
  readStageSequences: async () =>
    new Map((await stages.find<{ id: string; sequence: number | null }>({}, 'id sequence')).map((stage) => [stage.id, stage.sequence ?? 0])),
  readRows: async (caseIds) =>
    caseIds.length === 0 ? [] : (await helpdeskTicketSlas.find<RowNode>({ ticketId: { in: caseIds } }, ROW_SELECTION)).map(toRow),
  loadCalendars,
  // The unique pair index refuses a row another run has just made; the retry reads again and finds it.
  createRows: async (rows) => {
    if (rows.length > 0) {
      await retryOnConflict(() => helpdeskTicketSlas.createMany(rows));
    }
  },
  destroyRows: async (ids) => {
    if (ids.length > 0) {
      await helpdeskTicketSlas.destroyMany(ids);
    }
  },
  updateRow: (id, data) => helpdeskTicketSlas.update(id, data),
  writeCaseSummary: async (caseId, data) => {
    const [stored] = await cases.find<{ slaDeadline: string | null; slaStateExpired: boolean | null }>({ id: { eq: caseId } }, 'slaDeadline slaStateExpired');

    if (stored !== undefined && ((stored.slaDeadline ?? null) !== data.slaDeadline || (stored.slaStateExpired === true) !== data.slaStateExpired)) {
      await cases.update(caseId, data);
    }
  },
  withCaseClaim: async (caseId, run) => {
    for (let attempt = 1; attempt <= CLAIM_ATTEMPTS; attempt += 1) {
      const outcome = await withClaim(claimKey('caseSla', caseId), run);

      if (outcome.kind === 'done') {
        return outcome.result;
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs(attempt)));
    }
    throw new Error(CLAIM_HELD_MESSAGE);
  },
};
