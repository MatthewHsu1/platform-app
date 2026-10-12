import { LEAD_FILTER_CATALOGUE } from 'src/crm/assignment/lead-filter-catalogue';
import { lookupOneHop } from 'src/crm/assignment/lookup-one-hop';
import { type FilterCheck } from 'src/crm/assignment/types/filter-check.type';
import { planFilterChecks } from 'src/crm/assignment/utils/plan-filter-checks.util';
import { planFilterUndo } from 'src/crm/assignment/utils/plan-filter-undo.util';
import { TEAM_MESSAGES } from 'src/sales-team/team/team-messages';
import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';
import { type FilterCheckOutcome } from 'src/sales-team/types/filter-check-outcome.type';
import { toTwentyFilter } from 'src/shared/filter-editor/to-twenty-filter';
import { translateFilterError } from 'src/shared/filter-editor/translate-filter-error';
import { readMemberLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { putBack } from 'src/shared/triggers/put-back';
import { records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { distinctIds } from 'src/shared/utils/distinct-ids.util';
import { isTransientError } from 'src/shared/utils/is-transient-error.util';

type FilterObject = 'crmTeam' | 'crmTeamMember';

const TABLES = { crmTeam: records('crmTeam', 'crmTeams'), crmTeamMember: records('crmTeamMember', 'crmTeamMembers') } as const;
const SELECTIONS = { crmTeam: 'id assignmentDomain', crmTeamMember: 'id assignmentDomain assignmentDomainPreferred' } as const;

// Runs the filter as a one-row lead search; a failure, in the saver's
// language, is the reason the filter cannot be used. A dropped connection or
// the rate limit says nothing about the filter, so that error stops the check.
const filterProblem = async (text: string, locale: string): Promise<string | null> => {
  try {
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
    return null;
  } catch (error) {
    if (isTransientError(error)) {
      throw error;
    }
    return translateFilterError(error, (message, values) => translate(locale, message, values));
  }
};

// A filter a person saved that cannot run as a lead search is refused: a
// changed one gets its previous filters back with a note; a new team or
// member is handed back for its trigger to remove. Failures come back with the
// outcome, so the trigger still learns which rows are refused.
export const checkAssignmentFilters = async ({
  objectSingular,
  changes,
}: {
  objectSingular: FilterObject;
  changes: AssignmentFilterChange[];
}): Promise<FilterCheckOutcome> => {
  const outcome: FilterCheckOutcome = { refused: [], problems: [] };
  const checks = planFilterChecks(changes);

  if (checks.length === 0) {
    return outcome;
  }
  const table = TABLES[objectSingular];
  const errors = errorCollector();
  const stored = new Map(
    (
      await table.find<Record<string, unknown> & { id: string }>(
        { id: { in: distinctIds(checks.map((check) => check.recordId)) } },
        SELECTIONS[objectSingular],
      )
    ).map((row) => [row.id, row]),
  );
  const failed: { check: FilterCheck; reason: string }[] = [];

  for (const check of checks) {
    // A row removed or saved again since is left to that later save.
    if (stored.get(check.recordId)?.[check.field] !== check.after) {
      continue;
    }
    await errors.run(`${objectSingular} ${check.recordId}`, async () => {
      const problem = await filterProblem(check.after, await readMemberLocale(check.workspaceMemberId));

      if (problem !== null) {
        failed.push({ check, reason: problem });
      }
    });
  }
  const plan = planFilterUndo(failed);

  for (const item of plan.putBack) {
    await errors.run(`${objectSingular} ${item.recordId}`, async () => {
      await putBack({
        objectSingular,
        objectPlural: table.objectPlural,
        recordId: item.recordId,
        data: item.data,
        reason: translate(await readMemberLocale(item.workspaceMemberId), TEAM_MESSAGES.filterUnusable, { reason: item.reasons.join(' ') }),
      });
    });
  }
  for (const item of plan.destroy) {
    outcome.refused.push({
      recordId: item.recordId,
      reason: translate(await readMemberLocale(item.workspaceMemberId), TEAM_MESSAGES.filterUnusableCreate, { reason: item.reasons.join(' ') }),
    });
  }
  try {
    errors.throwIfAny();
  } catch (error) {
    outcome.problems.push(error instanceof Error ? error.message : String(error));
  }
  return outcome;
};
