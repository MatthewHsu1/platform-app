import { groupBy } from 'src/shared/utils/group-by.util';
import { type ProductTask } from 'src/stock/orderpoint/types/product-task.type';
import { type ReplenishmentIssue } from 'src/stock/orderpoint/types/replenishment-issue.type';
import { planReplenishmentIssueTasks } from 'src/stock/orderpoint/utils/plan-replenishment-issue-tasks.util';
import { addTask, tasks, taskTargets } from 'src/stock/stock-tasks';

// Every task each product has had, done and deleted ones too.
const readProductTasks = async (templateIds: string[]) => {
  const targets = await taskTargets.findIncludingDeleted<{ taskId: string | null; targetProductTemplateId: string }>(
    { targetProductTemplateId: { in: templateIds } },
    'taskId targetProductTemplateId',
  );
  const rows = await tasks.findIncludingDeleted<{
    id: string;
    status: string | null;
    deletedAt: string | null;
    bodyV2: { markdown: string | null } | null;
  }>(
    { id: { in: [...new Set(targets.flatMap((target) => (target.taskId === null ? [] : [target.taskId])))] } },
    'id status deletedAt bodyV2 { markdown }',
  );
  const taskById = new Map(rows.map((row) => [row.id, row]));
  const tasksByTemplate = new Map<string, ProductTask[]>();

  for (const [templateId, linked] of groupBy(targets, (target) => target.targetProductTemplateId)) {
    const taskIds = new Set(linked.flatMap((target) => (target.taskId === null ? [] : [target.taskId])));

    tasksByTemplate.set(
      templateId,
      [...taskIds].flatMap((taskId) => {
        const task = taskById.get(taskId);

        return task === undefined
          ? []
          : [{ id: task.id, body: task.bodyV2?.markdown ?? '', open: task.deletedAt === null && task.status !== 'DONE' }];
      }),
    );
  }

  return tasksByTemplate;
};

// A task on the product for each reordering rule that could not be run,
// unless an open task already says the same.
export const addReplenishmentIssueTasks = async (failures: ReplenishmentIssue[]) => {
  if (failures.length === 0) {
    return;
  }
  const planned = planReplenishmentIssueTasks({
    failures,
    tasksByTemplate: await readProductTasks([...new Set(failures.map((failure) => failure.productTemplateId))]),
  });

  for (const task of planned) {
    await addTask({
      objectSingular: 'productTemplate',
      recordId: task.productTemplateId,
      title: task.title,
      body: task.body,
      assigneeId: task.assigneeId,
      id: task.id,
    });
  }
};
