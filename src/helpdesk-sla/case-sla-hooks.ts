import { attachSlas, recomputeSlaRows } from 'src/helpdesk-sla/sla-engine-bound';
import { helpdeskTicketSlas } from 'src/helpdesk-sla/sla-records';
import { restoreCascaded } from 'src/shared/triggers/cascade-restore';

// A new case of a team that uses SLA gets a row for each matching policy.
export const attachSlasToNewCases = (caseIds: string[], now: string) => attachSlas(caseIds, { now, onlyWhenTeamUsesSla: true, mode: 'replace' });

// A case that has no rows yet gets them on the first save that sets its team. A case made on the page exists
// before its team is typed, so the rows could not wait for the create alone.
export const attachSlasToCasesWithNewTeam = (caseIds: string[], now: string) =>
  attachSlas(caseIds, { now, onlyWhenTeamUsesSla: true, mode: 'whenEmpty' });

// The stage saves of a case, in save order.
export const recomputeSlasOnStageSave = (saves: { caseId: string; stageId: string | null }[], now: string) => recomputeSlaRows(saves, now);

// Rows deleted with their case come back with it. Only a case delete puts these rows in the trash, so
// without the case's delete time every trashed row of the case is brought back.
export const restoreSlaRowsOfCases = async (cases: { id: string; deletedAt: string | null }[]) => {
  await restoreCascaded({ parents: cases, children: [{ of: helpdeskTicketSlas, field: 'ticketId' }] });
  const unknownTime = cases.filter((item) => item.deletedAt === null).map((item) => item.id);

  if (unknownTime.length > 0) {
    const trashed = await helpdeskTicketSlas.findIncludingDeleted<{ id: string; deletedAt: string | null }>(
      { ticketId: { in: unknownTime } },
      'id deletedAt',
    );
    const ids = trashed.filter((row) => row.deletedAt !== null).map((row) => row.id);

    if (ids.length > 0) {
      await helpdeskTicketSlas.restoreMany(ids);
    }
  }
};
