import { type DatabaseEventBatchPayload, defineLogicFunction, type ObjectRecordEvent } from 'twenty-sdk/define';

import { applyDeleteRules } from 'src/helpdesk/delete-rules/apply-delete-rules';
import { TEAM_DELETE_RULES } from 'src/helpdesk/delete-rules/team-delete-rules';
import { HELPDESK_MESSAGES } from 'src/helpdesk/helpdesk-messages.constant';
import { HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import 'src/helpdesk/team/team-delete-entries';
import { runTreePass } from 'src/helpdesk/tree/run-tree-pass';
import { applyTeamCalendarDefault } from 'src/helpdesk-sla/team-sla-hooks';
import { readEvents } from 'src/shared/triggers/batch-events';
import { records } from 'src/shared/triggers/records';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type TeamRecord = { id: string; name: string | null; parentId: string | null; completeName: string | null };

const teams = records('helpdeskTicketTeam', 'helpdeskTicketTeams');

const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<TeamRecord>>) => {
  const { operation, events } = readEvents<TeamRecord>(payload);
  const errors = errorCollector();

  if (operation === 'deleted') {
    await errors.run('delete rules', () =>
      applyDeleteRules(
        teams,
        TEAM_DELETE_RULES,
        events.map((event) => event.recordId),
      ),
    );
  }
  if (operation === 'created') {
    await errors.run('working hours', () =>
      applyTeamCalendarDefault(events.map((event) => event.recordId)),
    );
  }
  if (operation === 'created' || operation === 'updated' || operation === 'restored') {
    await errors.run('full names', () =>
      runTreePass({ rows: teams, operation, events, refusal: HELPDESK_MESSAGES.teamOwnParent }),
    );
  }
  errors.throwIfAny();

  return {};
};

export default defineLogicFunction({
  universalIdentifier: HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.helpdeskTicketTeam,
  name: 'platform-helpdesk-ticket-team',
  description:
    'Keeps the full name of each work case team right, refuses a team under itself, and clears a deleted team from its cases, child teams and links.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'helpdeskTicketTeam.*', batchMode: true },
});
