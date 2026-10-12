import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StatusMoves } from 'src/crm/lead/types/status-moves.type';
import { CRM_LEAD_SCORING_FREQUENCIES } from 'src/crm/scoring/crm-lead-scoring-frequencies';
import { readScoringRowsOf } from 'src/crm/scoring/read-scoring-rows';
import { planFrequencyWrites } from 'src/crm/scoring/utils/plan-frequency-writes.util';
import { planScoringDeltas } from 'src/crm/scoring/utils/plan-scoring-deltas.util';
import { readCrmSettings } from 'src/crm/settings/read-crm-settings';

// Keeps the won and lost counts up to date when leads are won, lost or
// reopened. The read and the write are separate calls, so two jobs at once
// can lose a change; a rebuild repairs the counts.
export const applyStatusMoves = async (moves: { lead: LeadRow; moves: StatusMoves }[]): Promise<void> => {
  const moving = moves.filter((entry) => entry.moves.won !== 0 || entry.moves.lost !== 0);

  if (moving.length === 0) {
    return;
  }
  const settings = await readCrmSettings();
  const { stages } = await loadLeadContext([]);
  const deltas = planScoringDeltas({ moves: moving, stages, fields: settings.plsFields, startDate: settings.plsStartDate });

  if (deltas.length === 0) {
    return;
  }
  const writes = planFrequencyWrites(await readScoringRowsOf(deltas), deltas);

  for (const update of writes.updates) {
    await CRM_LEAD_SCORING_FREQUENCIES.update(update.id, { wonCount: update.wonCount, lostCount: update.lostCount });
  }
  await CRM_LEAD_SCORING_FREQUENCIES.createMany(writes.creates);
};
