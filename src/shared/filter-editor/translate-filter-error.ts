import { FILTER_ERROR_MESSAGES } from 'src/shared/filter-editor/filter-error-messages.constant';
import { FilterError } from 'src/shared/filter-editor/to-twenty-filter';

type TranslateText = (message: string, values?: Record<string, string>) => string;

// A filter error in the reader's language, the field label translated too;
// any other error keeps its own text.
export const translateFilterError = (error: unknown, translateText: TranslateText): string => {
  if (!(error instanceof FilterError)) {
    return error instanceof Error ? error.message : String(error);
  }
  const field = error.values.field;

  return translateText(FILTER_ERROR_MESSAGES[error.code], {
    ...error.values,
    ...(field === undefined ? {} : { field: translateText(field) }),
  });
};
