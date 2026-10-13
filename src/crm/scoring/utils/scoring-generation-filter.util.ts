import { type ScoringGeneration } from 'src/crm/scoring/types/scoring-generation.type';

// A scoring read limited to the rows of the current set of counts.
export const withScoringGeneration = (filter: Record<string, unknown>, { since, before }: ScoringGeneration): Record<string, unknown> => {
  const bounds = [...(since === null ? [] : [{ createdAt: { gte: since } }]), ...(before === null ? [] : [{ createdAt: { lt: before } }])];

  return bounds.length === 0 ? filter : { and: [filter, ...bounds] };
};
