import { defineLogicFunction } from 'twenty-sdk/define';

import { assignLeads } from 'src/crm/assignment/assign-leads';
import { ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS } from 'src/crm/assignment/assignment-universal-identifiers.constant';
import { readScheduleTeamIds } from 'src/crm/assignment/door-teams';
import { planNextRun } from 'src/crm/assignment/utils/plan-next-run.util';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { writeCrmVariable } from 'src/crm/settings/write-crm-variable';

// The next run is stored once this run holds the assignment claim and before
// any lead moves: a run slower than the check is not started a second time,
// and a check that finds another run going stays due for the next check. A
// run stopped by a filter, or whose plug failed, fails the check, so the
// problem shows in the function's logs every time.
const handler = async () => {
  const settings = await readCrmSettings();

  if (!settings.autoAssignment || settings.autoAssignmentAction !== 'AUTO') {
    return { ran: false };
  }
  const plan = planNextRun({
    nextRun: settings.nextRun,
    now: new Date().toISOString(),
    intervalNumber: settings.intervalNumber,
    intervalType: settings.intervalType,
  });

  if (!plan.due) {
    return { ran: false };
  }
  const run = { started: false };
  const result = await assignLeads(
    { teamIds: await readScheduleTeamIds(), forceQuota: false, creationDeltaDays: 7, door: 'SCHEDULE', requestedBy: null },
    {
      onStart: async () => {
        await writeCrmVariable('CRM_AUTO_ASSIGNMENT_NEXT_RUN', plan.nextRun);
        run.started = true;
      },
    },
  );

  if (!run.started) {
    return { ran: false, messages: result.messages };
  }
  if (result.errors.length > 0 || result.plugError !== null) {
    throw new Error(`Lead assignment: ${result.messages.join(' | ')}`);
  }
  return { ran: true, nextRun: plan.nextRun, messages: result.messages };
};

export default defineLogicFunction({
  universalIdentifier: ASSIGNMENT_DOOR_UNIVERSAL_IDENTIFIERS.tick,
  name: 'crm-assignment-schedule',
  description: 'Every five minutes: runs the lead assignment when rule-based assignment repeats and its next run has come.',
  timeoutSeconds: 900,
  handler,
  cronTriggerSettings: { pattern: '*/5 * * * *' },
});
