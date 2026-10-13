import { kv } from 'twenty-sdk/logic-function';

import { type ScoringGeneration } from 'src/crm/scoring/types/scoring-generation.type';

const GENERATION_KEY = 'crm-scoring-generation';
const KV_OPTIONS = { scope: 'WORKSPACE' } as const;

const textOrNull = (value: unknown) => (typeof value === 'string' && value !== '' ? value : null);

// No stored generation reads every row, as before the first rebuild that stores one.
export const readScoringGeneration = async (): Promise<ScoringGeneration> => {
  const stored = await kv.get<unknown>(GENERATION_KEY, KV_OPTIONS);
  const value = typeof stored === 'object' && stored !== null ? (stored as Record<string, unknown>) : {};

  return { since: textOrNull(value.since), before: textOrNull(value.before) };
};

export const writeScoringGeneration = (generation: ScoringGeneration) => kv.set(GENERATION_KEY, generation, KV_OPTIONS);
