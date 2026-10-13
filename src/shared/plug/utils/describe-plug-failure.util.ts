import { translate } from 'src/shared/i18n/translate';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { type PlugFailure } from 'src/shared/plug/types/plug-failure.type';

type TranslateText = (message: string, values?: TranslationValues) => string;

const sourceText: TranslateText = (message, values) => translate(null, message, values);

// A plug failure as text, in the reader's language when given a translator.
export const describePlugFailure = (failure: PlugFailure, translateText: TranslateText = sourceText): string =>
  translateText(failure.message, {
    ...failure.values,
    ...(failure.cause === undefined ? {} : { reason: describePlugFailure(failure.cause, translateText) }),
  });
