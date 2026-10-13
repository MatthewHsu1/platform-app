import { type CaseStageRow } from 'src/helpdesk/types/case-stage-row.type';
import { sortCaseStages } from 'src/helpdesk/utils/applicable-stages.util';

type Group = { id: string; fieldValue: string | null; position: number; isVisible: boolean };

// One column per stage, in stage order, archived stages too (a board shows a case only when its stage has a
// column). A folded stage's column is hidden when the board folds them. Columns of stages that are gone, and
// a second column of one stage, are removed. The column of cases without a stage is left as staff set it.
export const planCaseBoardGroups = ({ stages, groups, hideFolded }: { stages: CaseStageRow[]; groups: Group[]; hideFolded: boolean }) => {
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
  const create: { fieldValue: string; position: number; isVisible: boolean }[] = [];
  const update: { id: string; position: number; isVisible: boolean }[] = [];

  sortCaseStages(stages).forEach((stage, position) => {
    const isVisible = hideFolded ? !stage.fold : true;
    const group = kept.get(stage.id);

    if (group === undefined) {
      create.push({ fieldValue: stage.id, position, isVisible });
    } else if (group.position !== position || group.isVisible !== isVisible) {
      update.push({ id: group.id, position, isVisible });
    }
  });

  return { create, update, remove };
};
