import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { sortStages } from 'src/crm/stage/utils/sort-stages.util';

type Group = { id: string; fieldValue: string | null; position: number };

// One column per stage, positioned in stage order. A board shows a lead only
// when its stage has a column, so a stage without one would hide its leads.
// The column of leads without a stage is left as staff set it.
export const planStageGroups = ({ stages, groups }: { stages: StageRow[]; groups: Group[] }) => {
  const stageGroups = groups
    .filter((group): group is Group & { fieldValue: string } => group.fieldValue !== null && group.fieldValue !== '')
    .sort((left, right) => left.position - right.position);
  const stageIds = new Set(stages.map((stage) => stage.id));
  const kept = new Map<string, Group>();
  const remove: string[] = [];

  for (const group of stageGroups) {
    if (!stageIds.has(group.fieldValue) || kept.has(group.fieldValue)) {
      remove.push(group.id);
    } else {
      kept.set(group.fieldValue, group);
    }
  }

  const create: { fieldValue: string; position: number }[] = [];
  const update: { id: string; position: number }[] = [];

  sortStages(stages).forEach((stage, position) => {
    const group = kept.get(stage.id);

    if (group === undefined) {
      create.push({ fieldValue: stage.id, position });
    } else if (group.position !== position) {
      update.push({ id: group.id, position });
    }
  });

  return { create, update, remove };
};
