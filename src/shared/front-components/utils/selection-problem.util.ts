import { type SelectionMode } from 'src/shared/front-components/types/selection-mode.type';
import { type SelectionProblem } from 'src/shared/front-components/types/selection-problem.type';

export const findSelectionProblem = (count: number, mode: SelectionMode): SelectionProblem | null => {
  if (count === 0) {
    return 'none';
  }

  return mode === 'one' && count > 1 ? 'tooMany' : null;
};
