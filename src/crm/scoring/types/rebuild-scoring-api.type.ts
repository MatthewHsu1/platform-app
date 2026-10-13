import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { type FrequencyWrites } from 'src/crm/scoring/types/frequency-writes.type';
import { type ScoringGeneration } from 'src/crm/scoring/types/scoring-generation.type';

export type RebuildScoringApi = {
  now: () => string;
  readRowIds: () => Promise<string[]>;
  readGeneration: () => Promise<ScoringGeneration>;
  writeGeneration: (generation: ScoringGeneration) => Promise<void>;
  createRows: (rows: FrequencyWrites['creates']) => Promise<void>;
  destroyRows: (ids: string[]) => Promise<void>;
  readClosedLeads: (since: string) => Promise<LeadRow[]>;
  readPendingLeads: (since: string) => Promise<LeadRow[]>;
  readStages: () => Promise<StageRow[]>;
  updateLeads: (ids: string[], data: Record<string, unknown>) => Promise<void>;
  wait: (ms: number) => Promise<void>;
};
