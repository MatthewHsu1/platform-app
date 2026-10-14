import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { UserError } from 'src/shared/user-error';

type FieldserviceActionStatus = 400 | 404 | 409;

// A refusal of a field service button. The route answers with its status and the message in the user's language.
export class FieldserviceActionError extends UserError {
  readonly status: FieldserviceActionStatus;

  constructor(message: string, values: TranslationValues = {}, status: FieldserviceActionStatus = 409) {
    super(message, values);
    this.name = 'FieldserviceActionError';
    this.status = status;
  }
}
