import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { rottingValues } from 'src/crm/lead/utils/rotting.util';

// The leads whose rotting values are out of date, grouped by their new values
// so each group is one write.
export const planRottingWrites = (leads: LeadRow[], stages: StageRow[], now: string) => {
  const groups = new Map<string, { ids: string[]; data: { isRotting: boolean; rottingDays: number } }>();

  for (const lead of leads) {
    const values = rottingValues(lead, stages.find((stage) => stage.id === lead.stageId) ?? null, now);

    if (values.isRotting === (lead.isRotting ?? false) && values.rottingDays === (lead.rottingDays ?? 0)) {
      continue;
    }
    const key = JSON.stringify(values);
    const group = groups.get(key) ?? { ids: [], data: values };

    group.ids.push(lead.id);
    groups.set(key, group);
  }

  return [...groups.values()];
};
