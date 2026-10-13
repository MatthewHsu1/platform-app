import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { UserError } from 'src/shared/user-error';

type LeadActionStatus = 400 | 404 | 409;

// A refusal of a lead button. The route answers with its status and the
// message in the user's language.
export class LeadActionError extends UserError {
  readonly status: LeadActionStatus;

  constructor(message: string, values: TranslationValues = {}, status: LeadActionStatus = 409) {
    super(message, values);
    this.name = 'LeadActionError';
    this.status = status;
  }
}
