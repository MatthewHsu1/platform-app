import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

type RebuildWrite = { ids: string[]; data: { automatedProbability: number; probability?: number } };

// Leads whose probability was empty or equal to the automated one follow the
// new value; a typed probability stays. Leads that would not change, and
// leads the counts cannot score, are not written. Leads that get the same
// values are written together.
export const planRebuildWrites = (pending: LeadRow[], scores: Map<string, number | null>): RebuildWrite[] => {
  const groups = new Map<string, RebuildWrite>();

  for (const lead of pending) {
    const value = scores.get(lead.id);

    if (value === undefined || value === null) {
      continue;
    }
    const follows = lead.probability === null || lead.probability === lead.automatedProbability;
    const changes = lead.automatedProbability !== value || (follows && lead.probability !== value);

    if (!changes) {
      continue;
    }
    const key = JSON.stringify([value, follows]);
    const group = groups.get(key) ?? {
      ids: [],
      data: follows ? { automatedProbability: value, probability: value } : { automatedProbability: value },
    };

    group.ids.push(lead.id);
    groups.set(key, group);
  }

  return [...groups.values()];
};
