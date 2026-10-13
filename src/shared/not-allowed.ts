import { translate } from 'src/shared/i18n/translate';
import { jsonResponse } from 'src/shared/route-response';
import { type GraphqlForbiddenError } from 'src/shared/twenty-graphql';

// Shown when the user's role may not read or change what a button works on.
export const NOT_ALLOWED_MESSAGE = 'Your role does not allow this.';

// Twenty's own text is technical, so it goes in `detail` beside a plain sentence.
export const notAllowedResponse = (locale: string, error: GraphqlForbiddenError) =>
  jsonResponse(409, { error: translate(locale, NOT_ALLOWED_MESSAGE), detail: error.message });
