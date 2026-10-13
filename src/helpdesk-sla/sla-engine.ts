import { type SlaApi } from 'src/helpdesk-sla/types/sla-api.type';
import { type SlaPolicy } from 'src/helpdesk-sla/types/sla-policy.type';
import { matchingSlas } from 'src/helpdesk-sla/utils/matching-slas.util';
import { planCaseSlaSummary } from 'src/helpdesk-sla/utils/plan-case-sla-summary.util';
import { planSlaRefresh } from 'src/helpdesk-sla/utils/plan-sla-refresh.util';
import { planSlaRow } from 'src/helpdesk-sla/utils/plan-sla-row.util';
import { planSlaStageChange } from 'src/helpdesk-sla/utils/plan-sla-stage-change.util';
import { type CalendarData } from 'src/resource/types/calendar-data.type';
import { planHours } from 'src/resource/utils/plan-hours.util';
import { workHoursCount } from 'src/resource/utils/work-hours-count.util';

// 'replace' starts a case from no rows and gives it every policy that matches (a new case). 'whenEmpty' does
// the same for a case that has no rows yet (the first save that sets its team). 'refresh' keeps the rows of
// policies that still apply, removes the others and adds the missing ones (the Refresh SLA button).
type AttachMode = 'replace' | 'whenEmpty' | 'refresh';

export const NO_WORKING_HOURS_WARNING = 'Work case {caseId}: its team has no working hours, so its service levels have no deadline.';

export const makeSlaEngine = (api: SlaApi) => {
  const contextFor = async (caseIds: string[]) => {
    const cases = await api.readCases(caseIds);
    const teams = await api.readTeams([...new Set(cases.flatMap((row) => (row.teamId === null ? [] : [row.teamId])))]);
    const calendarIds = [...new Set(teams.flatMap((team) => (team.resourceCalendarId === null ? [] : [team.resourceCalendarId])))];
    const [policies, sequences, calendars] = await Promise.all([api.readPolicies(), api.readStageSequences(), api.loadCalendars(calendarIds)]);
    // An empty stage counts as the lowest step.
    const stageSequence = (stageId: string | null) => (stageId === null ? 0 : (sequences.get(stageId) ?? 0));
    const calendarOf = (teamId: string | null) => {
      const team = teams.find((row) => row.id === teamId);

      return team?.resourceCalendarId == null ? null : (calendars.get(team.resourceCalendarId) ?? null);
    };

    return { cases, teams, policies, stageSequence, calendarOf };
  };

  // Without working hours there is nothing to plan on: the row is kept and has no deadline.
  const planFor = (data: CalendarData | null) => (hours: number, from: string) => (data === null ? null : planHours(data, hours, from, true));
  const workFor = (data: CalendarData | null) => (from: string, to: string) => (data === null ? 0 : workHoursCount(data, from, to, true));

  // Each case is handled under its claim, so a writer that comes second reads the rows the first one wrote.
  // Returns the warnings of the run.
  const attachSlas = async (caseIds: string[], options: { now: string; onlyWhenTeamUsesSla: boolean; mode: AttachMode }) => {
    const warnings: string[] = [];

    for (const caseId of caseIds) {
      await api.withCaseClaim(caseId, async () => {
        const { cases, teams, policies, stageSequence, calendarOf } = await contextFor([caseId]);
        const slaCase = cases[0];

        if (slaCase === undefined) {
          return;
        }
        const rows = await api.readRows([caseId]);
        const team = teams.find((row) => row.id === slaCase.teamId);
        const calendar = calendarOf(slaCase.teamId);
        let addPolicyIds: string[];

        if (options.mode === 'refresh') {
          const plan = planSlaRefresh({ rows, matching: matchingSlas(slaCase, policies).map((item) => item.id) });

          await api.destroyRows(plan.removeRowIds);
          addPolicyIds = plan.addPolicyIds;
        } else {
          if (options.mode === 'whenEmpty' && rows.length > 0) {
            return;
          }
          await api.destroyRows(rows.map((row) => row.id));
          if (options.onlyWhenTeamUsesSla && team?.useSla !== true) {
            return;
          }
          addPolicyIds = matchingSlas(slaCase, policies).map((item) => item.id);
        }
        if (addPolicyIds.length > 0 && calendar === null) {
          warnings.push(NO_WORKING_HOURS_WARNING.replace('{caseId}', caseId));
        }
        await api.createRows(
          addPolicyIds.map((policyId) => ({
            ticketId: caseId,
            ...planSlaRow({
              policy: policies.find((item) => item.id === policyId) as SlaPolicy,
              caseStageId: slaCase.stageId,
              caseCreatedAt: slaCase.createdAt,
              stageSequence,
              hoursPerDay: calendar?.calendar.hoursPerDay ?? 0,
              plan: planFor(calendar),
            }),
          })),
        );
      });
    }

    return warnings;
  };

  // The saves of a case are applied in order, each on the rows the one before left.
  const recomputeSlaRows = async (saves: { caseId: string; stageId: string | null }[], now: string) => {
    for (const caseId of [...new Set(saves.map((save) => save.caseId))]) {
      await api.withCaseClaim(caseId, async () => {
        const { cases, policies, stageSequence, calendarOf } = await contextFor([caseId]);
        const calendar = calendarOf(cases[0]?.teamId ?? null);
        let rows = await api.readRows([caseId]);

        for (const save of saves.filter((item) => item.caseId === caseId)) {
          for (const current of rows) {
            const changes = planSlaStageChange({
              row: current,
              caseStageId: save.stageId,
              ignoreStageIds: policies.find((item) => item.id === current.slaId)?.ignoreStageIds ?? [],
              stageSequence,
              now,
              workHours: workFor(calendar),
              plan: planFor(calendar),
            });

            if (Object.keys(changes).length > 0) {
              await api.updateRow(current.id, changes);
              rows = rows.map((item) => (item.id === current.id ? { ...item, ...changes } : item));
            }
          }
        }
      });
    }
  };

  const refreshCaseSlaSummary = async (caseIds: string[]) => {
    const rows = await api.readRows(caseIds);
    const cases = await api.readCases(caseIds);

    for (const slaCase of cases) {
      await api.writeCaseSummary(
        slaCase.id,
        planCaseSlaSummary(rows.filter((row) => row.ticketId === slaCase.id)),
      );
    }
  };

  return { attachSlas, recomputeSlaRows, refreshCaseSlaSummary };
};
