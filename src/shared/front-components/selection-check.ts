import { type MessageDescriptor, msg } from 'twenty-sdk/front-component';

import { type SelectionMode } from 'src/shared/front-components/types/selection-mode.type';
import { type SelectionProblem } from 'src/shared/front-components/types/selection-problem.type';
import { findSelectionProblem } from 'src/shared/front-components/utils/selection-problem.util';

export const SELECTION_PROBLEM_TEXT: Record<SelectionProblem, MessageDescriptor> = {
  none: msg('Tick at least one record.'),
  tooMany: msg('Choose one record.'),
};

// The text to show when the ticked records do not suit the button, or null when they do. Translate it with `t`.
export const checkSelection = (count: number, mode: SelectionMode): MessageDescriptor | null => {
  const problem = findSelectionProblem(count, mode);

  return problem === null ? null : SELECTION_PROBLEM_TEXT[problem];
};

// The record a one-record button works on, or the text that says why there is none.
export const selectOneRecord = (
  ids: string[],
): { id: string; message: null } | { id: null; message: MessageDescriptor } => {
  const message = checkSelection(ids.length, 'one');
  const [id] = ids;

  return message === null && id !== undefined ? { id, message: null } : { id: null, message: message ?? SELECTION_PROBLEM_TEXT.none };
};
