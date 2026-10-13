import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { UserError } from 'src/shared/user-error';

type CaseActionStatus = 400 | 404 | 409;

// A refusal of a work case button. The route answers with its status and the message in the user's language.
export class CaseActionError extends UserError {
  readonly status: CaseActionStatus;

  constructor(message: string, values: TranslationValues = {}, status: CaseActionStatus = 409) {
    super(message, values);
    this.name = 'CaseActionError';
    this.status = status;
  }
}
