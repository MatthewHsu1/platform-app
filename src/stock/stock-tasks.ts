import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { records } from 'src/shared/triggers/records';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { derivedId } from 'src/shared/utils/derived-id.util';

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

export const tasks = records('task', 'tasks');
export const taskTargets = records('taskTarget', 'taskTargets');

// A task attaches to a record through a target field named after the object, as notes do. With an id, a rerun after
// a stop finds the task and its target instead of making a second one, even when someone has deleted the task.
export const addTask = async ({
  objectSingular,
  recordId,
  title,
  body,
  assigneeId,
  dueAt,
  id,
}: {
  objectSingular: string;
  recordId: string;
  title: string;
  body: string;
  assigneeId: string | null;
  dueAt?: string | null;
  id?: string;
}) => {
  const taskData = {
    title,
    bodyV2: { markdown: body },
    ...(assigneeId === null ? {} : { assigneeId }),
    ...(dueAt === undefined || dueAt === null ? {} : { dueAt }),
  };

  if (id !== undefined) {
    await createMissingRows(tasks, [{ id, data: taskData }]);
    await createMissingRows(taskTargets, [
      { id: derivedId('taskTarget', id), data: { taskId: id, [`target${capitalize(objectSingular)}Id`]: recordId } },
    ]);
    return;
  }
  const task = requireData(
    await twentyGraphql<{ createTask: { id: string } }>(
      'application',
      `mutation AddTask($data: TaskCreateInput!) { createTask(data: $data) { id } }`,
      { data: taskData },
    ),
    'Create task',
  );
  requireData(
    await twentyGraphql(
      'application',
      `mutation LinkTask($data: TaskTargetCreateInput!) { createTaskTarget(data: $data) { id } }`,
      { data: { taskId: task.createTask.id, [`target${capitalize(objectSingular)}Id`]: recordId } },
    ),
    'Link task',
  );
};
