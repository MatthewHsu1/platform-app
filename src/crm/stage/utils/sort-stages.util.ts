import { type StageRow } from 'src/crm/lead/types/stage-row.type';

// The order staff see stages in: sequence, then name, then creation.
export const sortStages = (stages: StageRow[]) =>
  [...stages].sort(
    (left, right) =>
      left.sequence - right.sequence ||
      left.name.localeCompare(right.name) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id),
  );
