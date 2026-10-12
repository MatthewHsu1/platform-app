import { translate } from 'src/shared/i18n/translate';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

// Thrown by a plug point's answer check: an English source text and its
// values, so the reason reaches the user in their language.
export class PlugAnswerError extends Error {
  constructor(
    readonly source: string,
    readonly values: TranslationValues = {},
  ) {
    super(translate(null, source, values));
    this.name = 'PlugAnswerError';
  }
}
