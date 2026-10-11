import { type MemberCandidate } from 'src/sales-team/member/types/member-candidate.type';
import { type MemberTriggerApi } from 'src/sales-team/member/types/member-trigger-api.type';
import { planMemberRefusal } from 'src/sales-team/member/utils/plan-member-refusal.util';
import { planMembershipArchive } from 'src/sales-team/member/utils/plan-membership-archive.util';
import { TEAM_MESSAGES } from 'src/sales-team/team/team-messages';
import { type AssignmentFilterChange } from 'src/sales-team/types/assignment-filter-change.type';
import { isApplicationWrite, isStaffChange } from 'src/shared/triggers/actor';
import { type RecordOperation } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { distinctIds } from 'src/shared/utils/distinct-ids.util';

type MemberEvent = {
  recordId: string;
  userId?: string;
  workspaceMemberId?: string;
  properties: { before?: Record<string, unknown>; after?: Record<string, unknown>; updatedFields?: string[] };
};

// A relation is listed under its name and its join column.
const PAIR_FIELDS: Record<string, string> = { crmTeam: 'crmTeamId', crmTeamId: 'crmTeamId', user: 'userId', userId: 'userId', active: 'active' };
const FILTER_FIELDS = ['assignmentDomain', 'assignmentDomainPreferred'] as const;
const CAPACITY_FIELDS = ['assignmentMax', 'active', 'crmTeam', 'crmTeamId'];

const textOf = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);
const fieldsOf = (event: MemberEvent) => event.properties.updatedFields ?? [];
const sideOf = (event: MemberEvent, field: string) => event.properties.after?.[field] ?? event.properties.before?.[field];

// One active row per team and salesperson; with one team per salesperson, a
// row made or switched on archives their other teams; the name follows the
// salesperson; the team capacity follows its active members.
export const makeRunMemberTrigger =
  (api: MemberTriggerApi) =>
  async ({ operation, events }: { operation: RecordOperation; events: MemberEvent[] }) => {
    const errors = errorCollector();
    const touchedTeamIds = new Set<string>();

    for (const event of events.filter((candidate) => operation !== 'updated' || fieldsOf(candidate).some((field) => CAPACITY_FIELDS.includes(field)))) {
      for (const teamId of [textOf(event.properties.before?.crmTeamId), textOf(event.properties.after?.crmTeamId)]) {
        if (teamId !== null) {
          touchedTeamIds.add(teamId);
        }
      }
    }

    // Platform's own member writes only archive and rename rows.
    const checked = events.filter(
      (event) =>
        event.properties.after?.active !== false &&
        isStaffChange(operation, event, event.properties.after) &&
        (operation === 'created' || operation === 'restored' || (operation === 'updated' && fieldsOf(event).some((field) => field in PAIR_FIELDS))),
    );
    let refused = new Set<string>();

    if (checked.length > 0) {
      const rows = await api.membershipsOfUsers(distinctIds(checked.map((event) => textOf(sideOf(event, 'userId')))));
      const checkedIds = new Set(checked.map((event) => event.recordId));
      // The stored row decides: one changed again since this save is checked as it is now.
      const candidates = rows.filter((row) => checkedIds.has(row.id) && row.active);

      const duplicates = planMemberRefusal({ candidates, rows });

      if (duplicates.length > 0) {
        const duplicateRows = candidates.filter((row) => duplicates.includes(row.id));
        const names = await api.userNames(distinctIds(duplicateRows.map((row) => row.userId)));
        const reasonFor = async (row: MemberCandidate) => {
          const event = checked.find((candidate) => candidate.recordId === row.id);

          return api.translate(await api.memberLocale(event?.workspaceMemberId), TEAM_MESSAGES.duplicateMember, {
            name: names.get(row.userId ?? '') ?? '',
          });
        };

        if (operation === 'created') {
          // One save is one batch, and a save that makes a duplicate is refused
          // whole: every row it made goes, not only the duplicate.
          refused = new Set(events.map((event) => event.recordId));
          await errors.run('refused create', async () => {
            const reasons = await Promise.all(duplicateRows.map(reasonFor));

            await api.destroyMembers([...refused]);
            for (const [index, row] of duplicateRows.entries()) {
              if (row.teamId !== null) {
                await api.noteOnTeam(row.teamId, reasons[index]);
              }
            }
            throw new Error(`The new team members were removed. ${[...new Set(reasons)].join(' ')}`);
          });
        } else {
          refused = new Set(duplicates);
          for (const row of duplicateRows) {
            const event = checked.find((candidate) => candidate.recordId === row.id);

            await errors.run(row.id, async () => {
              if (operation === 'restored') {
                await api.softDeleteMember(row.id);
              } else {
                const written = new Set(fieldsOf(event ?? { recordId: row.id, properties: {} }).flatMap((field) => PAIR_FIELDS[field] ?? []));

                await api.putBackMember(row.id, Object.fromEntries([...written].map((field) => [field, event?.properties.before?.[field] ?? null])));
              }
              if (row.teamId !== null) {
                await api.noteOnTeam(row.teamId, await reasonFor(row));
              }
            });
          }
        }
      }

      const switchedOn = (row: MemberCandidate) => {
        const event = checked.find((candidate) => candidate.recordId === row.id);

        return operation !== 'updated' || event?.properties.before?.active === false;
      };
      const accepted = candidates.filter((row) => !refused.has(row.id) && switchedOn(row));
      const toArchive = planMembershipArchive({
        accepted,
        rows: rows.filter((row) => !refused.has(row.id)),
        membershipMulti: (await api.readSettings()).membershipMulti,
      });

      if (toArchive.length > 0) {
        for (const row of rows.filter((candidate) => toArchive.includes(candidate.id))) {
          if (row.teamId !== null) {
            touchedTeamIds.add(row.teamId);
          }
        }
        await errors.run('archive', () => api.archiveMembers(toArchive));
      }
    }

    const renamed = events.filter(
      (event) =>
        event.properties.after !== undefined &&
        !refused.has(event.recordId) &&
        (operation === 'created' || (operation === 'updated' && fieldsOf(event).some((field) => field === 'user' || field === 'userId'))),
    );

    if (renamed.length > 0) {
      await errors.run('names', async () => {
        const names = await api.userNames(distinctIds(renamed.map((event) => textOf(event.properties.after?.userId))));

        for (const event of renamed) {
          const name = names.get(textOf(event.properties.after?.userId) ?? '') ?? null;

          if (name !== (textOf(event.properties.after?.name) ?? null)) {
            await api.renameMember(event.recordId, name);
          }
        }
      });
    }

    if (operation === 'updated') {
      const changes: AssignmentFilterChange[] = events.flatMap((event) =>
        FILTER_FIELDS.filter((field) => fieldsOf(event).includes(field)).map((field) => ({
          recordId: event.recordId,
          field,
          before: textOf(event.properties.before?.[field]),
          after: textOf(event.properties.after?.[field]),
          staffChange: !isApplicationWrite(event.properties.after),
          workspaceMemberId: event.workspaceMemberId,
        })),
      );

      if (changes.length > 0) {
        await errors.run('filters', () => api.checkAssignmentFilters(changes));
      }
    }

    if (touchedTeamIds.size > 0) {
      await errors.run('capacity', () => api.recomputeCapacity([...touchedTeamIds]));
    }

    errors.throwIfAny();
  };
