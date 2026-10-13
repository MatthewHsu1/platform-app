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
    // A refused new team goes in the order of a team delete, so it strands
    // nothing: scoring counts, then its leads, then what would block or
    // outlive its removal.
    const removeTeams = async (teamIds: string[]) => {
      await api.foldTeamScoring(teamIds);
      await api.clearTeamOnLeads(teamIds);
      await api.destroyStageLinksOf(teamIds);
      await api.destroyMembersOf(teamIds);
      await api.destroyTeams(teamIds);
    };

    // A new team whose filter cannot run is removed, so nothing else is done for it.
    let removed = new Set<string>();

    if (operation === 'created' || operation === 'updated') {
      const changes: AssignmentFilterChange[] = events
        .filter((event) =>
          operation === 'created'
            ? textOf(event.properties.after?.assignmentDomain) !== null
            : (event.properties.updatedFields ?? []).includes('assignmentDomain'),
        )
        .map((event) => ({
          recordId: event.recordId,
          operation,
          field: 'assignmentDomain',
          before: textOf(event.properties.before?.assignmentDomain),
          after: textOf(event.properties.after?.assignmentDomain),
          staffChange: !isApplicationWrite(event.properties.after),
          workspaceMemberId: event.workspaceMemberId,
        }));

      let refused: { recordId: string; reason: string }[] = [];

      if (changes.length > 0) {
        await errors.run('filters', async () => {
          const outcome = await api.checkAssignmentFilters(changes);

          refused = outcome.refused;
          if (outcome.problems.length > 0) {
            throw new Error(outcome.problems.join(' '));
          }
        });
      }
      removed = new Set(refused.map((item) => item.recordId));

      if (refused.length > 0) {
        const reasons = refused.map((item) => item.reason).join(' ');

        // No record is left to hold a note, so the trigger fails with the reasons.
        await errors.run('refused teams', async () => {
          await removeTeams([...removed]).catch((error: unknown) => {
            throw new Error(`${reasons} ${error instanceof Error ? error.message : String(error)}`);
          });
          throw new Error(reasons);
        });
      }
    }

    if (operation === 'created') {
      for (const event of events.filter((candidate) => !removed.has(candidate.recordId) && textOf(candidate.properties.after?.color) === null)) {
        await errors.run(event.recordId, () => api.setColor(event.recordId, api.pickColor()));
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
