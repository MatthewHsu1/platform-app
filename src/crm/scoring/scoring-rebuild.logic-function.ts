import { defineLogicFunction } from 'twenty-sdk/define';

import { rebuildScoring } from 'src/crm/scoring/rebuild-scoring';
import { SCORING_REBUILD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/crm/scoring/scoring-universal-identifiers.constant';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';

// Off unless an administrator turns it on; until then the counts follow the
// live changes and drift only until the next manual rebuild.
const handler = async () => {
  if (!(await readCrmSettings()).plsRebuildCron) {
    return { skipped: true };
  }

  const outcome = await rebuildScoring();

  return outcome.kind === 'held' ? { skipped: true, reason: 'another rebuild is running' } : outcome.result;
};

export default defineLogicFunction({
  universalIdentifier: SCORING_REBUILD_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'rebuild-lead-scoring',
  description: 'Rebuilds the lead scoring counts every night when the switch is on.',
  timeoutSeconds: 900,
  handler,
  cronTriggerSettings: { pattern: '0 3 * * *' },
});
