import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

// A refusal the user reads. The message is the English source; the route
// translates it with the values into the user's language. `details` go into
// the answer beside the text, for a pop-up that must know what the flow made.
export class UserError extends Error {
  readonly values: TranslationValues;
  readonly details: Record<string, unknown>;

  constructor(message: string, values: TranslationValues = {}, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'UserError';
    this.values = values;
    this.details = details;
  }
}
