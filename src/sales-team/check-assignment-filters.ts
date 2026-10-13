import { LEAD_FILTER_CATALOGUE } from 'src/crm/assignment/lead-filter-catalogue';
import { lookupOneHop } from 'src/crm/assignment/lookup-one-hop';
import { type FilterCheck } from 'src/crm/assignment/types/filter-check.type';
import { planFilterChecks } from 'src/crm/assignment/utils/plan-filter-checks.util';
import { planFilterUndo } from 'src/crm/assignment/utils/plan-filter-undo.util';
import { TEAM_MESSAGES } from 'src/sales-team/team/team-messages';
import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';
import { type FilterCheckOutcome } from 'src/sales-team/types/filter-check-outcome.type';
import { isFilterRefusal } from 'src/shared/filter-editor/is-filter-refusal';
import { toTwentyFilter } from 'src/shared/filter-editor/to-twenty-filter';
import { translateFilterError } from 'src/shared/filter-editor/translate-filter-error';
import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { putBack } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { distinctIds } from 'src/shared/utils/distinct-ids.util';

type FilterObject = 'crmTeam' | 'crmTeamMember';

// What the check reads and writes. The real one uses the app token; tests pass
// an in-memory one.
type FilterCheckApi = {
  readStored: (objectSingular: FilterObject, recordIds: string[]) => Promise<(Record<string, unknown> & { id: string })[]>;
  // Throws when the filter cannot run as a one-row lead search.
  runFilter: (text: string) => Promise<void>;
  putBack: (input: { objectSingular: FilterObject; recordId: string; data: Record<string, unknown>; reason: string }) => Promise<void>;
  memberLocale: (workspaceMemberId: string | undefined) => Promise<string>;
};

const TABLES = { crmTeam: records('crmTeam', 'crmTeams'), crmTeamMember: records('crmTeamMember', 'crmTeamMembers') } as const;
const SELECTIONS = { crmTeam: 'id assignmentDomain', crmTeamMember: 'id assignmentDomain assignmentDomainPreferred' } as const;

// Only a filter refusal is a reason, in the saver's language. Any other error
// (an outage, the rate limit) says nothing about the filter, so it stops the
// check and the row stays as saved.
const filterProblem = async (api: FilterCheckApi, text: string, locale: string): Promise<string | null> => {
  try {
    await api.runFilter(text);
    return null;
  } catch (error) {
    if (!isFilterRefusal(error)) {
      throw error;
    }
    return translateFilterError(error, (message, values) => translate(locale, message, values));
  }
};

// A filter a person saved that cannot run as a lead search is refused: a
// changed one gets its previous filters back with a note; a new team or
// member is handed back for its trigger to remove. Failures come back with the
// outcome, so the trigger still learns which rows are refused.
export const makeCheckAssignmentFilters =
  (api: FilterCheckApi) =>
  async ({ objectSingular, changes }: { objectSingular: FilterObject; changes: AssignmentFilterChange[] }): Promise<FilterCheckOutcome> => {
    const outcome: FilterCheckOutcome = { refused: [], problems: [] };
    const checks = planFilterChecks(changes);

    if (checks.length === 0) {
      return outcome;
    }
    const errors = errorCollector();
    const stored = new Map(
      (await api.readStored(objectSingular, distinctIds(checks.map((check) => check.recordId)))).map((row) => [row.id, row]),
    );
    const failed: { check: FilterCheck; reason: string }[] = [];

    for (const check of checks) {
      // A row removed or saved again since is left to that later save.
      if (stored.get(check.recordId)?.[check.field] !== check.after) {
        continue;
      }
      await errors.run(`${objectSingular} ${check.recordId}`, async () => {
        const problem = await filterProblem(api, check.after, await api.memberLocale(check.workspaceMemberId));

        if (problem !== null) {
          failed.push({ check, reason: problem });
        }
      });
    }
    const plan = planFilterUndo(failed);

    for (const item of plan.putBack) {
      await errors.run(`${objectSingular} ${item.recordId}`, async () => {
        await api.putBack({
          objectSingular,
          recordId: item.recordId,
          data: item.data,
          reason: translate(await api.memberLocale(item.workspaceMemberId), TEAM_MESSAGES.filterUnusable, { reason: item.reasons.join(' ') }),
        });
      });
    }
    for (const item of plan.destroy) {
      outcome.refused.push({
        recordId: item.recordId,
        reason: translate(await api.memberLocale(item.workspaceMemberId), TEAM_MESSAGES.filterUnusableCreate, { reason: item.reasons.join(' ') }),
      });
    }
    try {
      errors.throwIfAny();
    } catch (error) {
      outcome.problems.push(error instanceof Error ? error.message : String(error));
    }
    return outcome;
  };

export const checkAssignmentFilters = makeCheckAssignmentFilters({
  readStored: (objectSingular, recordIds) =>
    TABLES[objectSingular].find<Record<string, unknown> & { id: string }>({ id: { in: recordIds } }, SELECTIONS[objectSingular]),
  runFilter: async (text) => {
    const filter = await toTwentyFilter(text, LEAD_FILTER_CATALOGUE, lookupOneHop('application'));

    if (filter !== null) {
      requireData(
        await twentyGraphql(
          'application',
          'query CheckFilter($filter: CrmLeadFilterInput) { crmLeads(filter: $filter, first: 1) { edges { node { id } } } }',
          { filter },
        ),
        'Run the filter',
      );
    }
  },
  putBack: ({ objectSingular, recordId, data, reason }) =>
    putBack({ objectSingular, objectPlural: TABLES[objectSingular].objectPlural, recordId, data, reason }),
  memberLocale: readMemberLocale,
});
