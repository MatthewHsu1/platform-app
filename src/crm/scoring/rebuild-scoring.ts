import { WON_STATUS } from 'src/crm/crm-options.constant';
import { readLeadRow } from 'src/crm/lead/lead-selection';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { CRM_LEAD_SCORING_FREQUENCIES } from 'src/crm/scoring/crm-lead-scoring-frequencies';
import { readScoringGeneration, writeScoringGeneration } from 'src/crm/scoring/scoring-generation';
import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { type RebuildScoringApi } from 'src/crm/scoring/types/rebuild-scoring-api.type';
import { planRebuildRows } from 'src/crm/scoring/utils/plan-rebuild-rows.util';
import { planRebuildWrites } from 'src/crm/scoring/utils/plan-rebuild-writes.util';
import { isScoringStartDate } from 'src/crm/scoring/utils/scoring-pairs.util';
import { readWithScoringFields } from 'src/crm/lead/utils/read-with-scoring-fields.util';
import { scoreLeads } from 'src/crm/scoring/utils/score-leads.util';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';
import { claimKey, withClaim } from 'src/shared/claims/claim';
import { records } from 'src/shared/triggers/records';
import { chunks } from 'src/shared/utils/chunks.util';

const LEADS = records('crmLead', 'crmLeads');

const findLeads = async (filter: Record<string, unknown>) =>
  (await readWithScoringFields((selection) => LEADS.find<Record<string, unknown>>(filter, selection), { withTeam: true })).map(readLeadRow);

type Settings = { plsStartDate: string | null; plsFields: PlsFieldKey[] };

// A busy database can time out a destroy, so the old rows go a few at a time
// and a part that fails is tried again after a pause.
const DESTROY_CHUNK = 50;
const DESTROY_TRIES = 3;
const DESTROY_PAUSE_MS = 2_000;

const destroyOldRows = async (api: RebuildScoringApi, ids: string[]) => {
  let left = 0;

  for (const part of chunks(ids, DESTROY_CHUNK)) {
    for (let attempt = 1; ; attempt += 1) {
      try {
        await api.destroyRows(part);
        break;
      } catch {
        if (attempt >= DESTROY_TRIES) {
          left += part.length;
          break;
        }
        await api.wait(DESTROY_PAUSE_MS * attempt);
      }
    }
  }
  return left;
};

// Counts every closed lead again, then rescores the open leads. The score
// always reads one whole set of counts: while the new rows are written it
// reads the old ones only (rows made before the run started), and it moves to
// the new ones once they are all there. Only then are the old rows removed;
// rows left by a run that could not remove them are no longer read, and the
// next run removes them. A run whose new rows fail leaves the score on the old
// counts. A missing or bad start date leaves no counts. The probability
// writes are plain updates: no save rule runs, and the clamp keeps every
// status as it was.
export const makeRebuildScoring =
  (api: RebuildScoringApi) =>
  async ({ plsStartDate, plsFields }: Settings): Promise<{ rows: number; leadsWritten: number; oldRowsLeft: number }> => {
    const oldIds = await api.readRowIds();
    const previous = await api.readGeneration();
    const startedAt = api.now();

    await api.writeGeneration({ since: previous.since, before: startedAt });

    const since = isScoringStartDate(plsStartDate) ? `${plsStartDate}T00:00:00.000Z` : null;
    const stages = await api.readStages();
    const creates = since === null ? [] : planRebuildRows(await api.readClosedLeads(since), stages, plsFields);

    await api.createRows(creates);
    await api.writeGeneration({ since: startedAt, before: null });

    // The open leads are rescored before the old rows go: removing them is
    // the slow part and changes no score.
    const pending = since === null ? [] : await api.readPendingLeads(since);
    // The score reads only the counts, so the planned rows serve without their stored ids.
    const rows = creates.map((created, index) => ({ ...created, id: `planned-${index}`, createdAt: since ?? startedAt }));
    const writes = planRebuildWrites(pending, scoreLeads(pending, rows, stages, plsFields));

    for (const write of writes) {
      await api.updateLeads(write.ids, write.data);
    }
    const oldRowsLeft = await destroyOldRows(api, oldIds);

    return { rows: creates.length, leadsWritten: writes.reduce((sum, write) => sum + write.ids.length, 0), oldRowsLeft };
  };

const TWENTY_REBUILD_SCORING_API: RebuildScoringApi = {
  now: () => new Date().toISOString(),
  readRowIds: async () => (await CRM_LEAD_SCORING_FREQUENCIES.findIncludingDeleted<{ id: string }>({}, 'id')).map((row) => row.id),
  readGeneration: readScoringGeneration,
  writeGeneration: writeScoringGeneration,
  createRows: async (rows) => {
    await CRM_LEAD_SCORING_FREQUENCIES.createMany(rows);
  },
  destroyRows: async (ids) => {
    await CRM_LEAD_SCORING_FREQUENCIES.destroyMany(ids);
  },
  readClosedLeads: (since) => findLeads({ createdAt: { gte: since }, wonStatus: { in: [WON_STATUS.WON, WON_STATUS.LOST] } }),
  readPendingLeads: (since) => findLeads({ createdAt: { gte: since }, wonStatus: { eq: WON_STATUS.PENDING }, stageId: { is: 'NOT_NULL' } }),
  readStages: async () => (await loadLeadContext([])).stages,
  updateLeads: (ids, data) => LEADS.updateMany(ids, data),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

const REBUILD_CLAIM_KEY = claimKey('crmScoringRebuild', 'all');

// One rebuild at a time, whichever door started it: two at once remove each
// other's rows and wait on each other's locks. A run that just stored new
// settings passes them, since its own variables are read when it starts.
export const rebuildScoring = async (overrides: { plsStartDate: string; plsFields: PlsFieldKey[] } | null = null) =>
  withClaim(REBUILD_CLAIM_KEY, async () => makeRebuildScoring(TWENTY_REBUILD_SCORING_API)(overrides ?? (await readCrmSettings())));
