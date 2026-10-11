import { TEAM_MESSAGES } from 'src/sales-team/team/team-messages';
import { type TeamTriggerApi } from 'src/sales-team/team/types/team-trigger-api.type';
import { planTeamDelete } from 'src/sales-team/team/utils/plan-team-delete.util';
import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';
import { isApplicationWrite } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type TeamEvent = {
  recordId: string;
  workspaceMemberId?: string;
  properties: { before?: Record<string, unknown>; after?: Record<string, unknown>; updatedFields?: string[] };
};

const textOf = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

// Deletes are checked for every writer. A refused delete stops there; an
// allowed one folds the team's scoring rows first, then removes its members
// and takes it off its leads.
export const makeRunTeamTrigger =
  (api: TeamTriggerApi) =>
  async ({ operation, events }: { operation: RecordOperation; events: TeamEvent[] }) => {
    const errors = errorCollector();

    if (operation === 'created') {
      for (const event of events.filter((candidate) => textOf(candidate.properties.after?.color) === null)) {
        await errors.run(event.recordId, () => api.setColor(event.recordId, api.pickColor()));
      }
    }

    if (operation === 'updated') {
      const changes: AssignmentFilterChange[] = events
        .filter((event) => (event.properties.updatedFields ?? []).includes('assignmentDomain'))
        .map((event) => ({
          recordId: event.recordId,
          field: 'assignmentDomain',
          before: textOf(event.properties.before?.assignmentDomain),
          after: textOf(event.properties.after?.assignmentDomain),
          staffChange: !isApplicationWrite(event.properties.after),
          workspaceMemberId: event.workspaceMemberId,
        }));

      if (changes.length > 0) {
        await errors.run('filters', () => api.checkAssignmentFilters(changes));
      }
    }

    if (operation === 'deleted') {
      const deleted = await api.stillDeletedTeams(events.map((event) => event.recordId));
      const plan = planTeamDelete({ deleted, linkedTeamIds: await api.teamIdsOnStages(deleted.map((team) => team.id)) });

      for (const refusal of plan.restore) {
        const event = events.find((candidate) => candidate.recordId === refusal.id);

        await errors.run(refusal.id, async () =>
          api.restoreTeam(
            refusal.id,
            api.translate(
              await api.memberLocale(event?.workspaceMemberId),
              refusal.reason === 'DEFAULT_TEAM' ? TEAM_MESSAGES.defaultTeam : TEAM_MESSAGES.usedByStage,
            ),
          ),
        );
      }

      if (plan.proceed.length > 0) {
        await errors.run('scoring', () => api.foldTeamScoring(plan.proceed));
        await errors.run('members', () => api.deleteMembersOf(plan.proceed));
        await errors.run('leads', () => api.clearTeamOnLeads(plan.proceed));
      }
    }

    errors.throwIfAny();
  };
