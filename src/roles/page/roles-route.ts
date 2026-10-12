import { type RoutePayload } from 'twenty-sdk/define';

import { NoPersonBehindRequestError } from 'src/roles/no-person-behind-request.error';
import { ROLES_MESSAGES } from 'src/roles/roles-messages.constant';
import { RoleSyncBusyError } from 'src/roles/sync/sync-mixed-roles';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { notAllowedResponse } from 'src/shared/not-allowed';
import { jsonResponse, readBody } from 'src/shared/route-response';
import { GraphqlForbiddenError } from 'src/shared/twenty-graphql';

export class RolesUserError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly values: TranslationValues = {},
  ) {
    super(message);
    this.name = 'RolesUserError';
  }
}

export const makeRolesRouteHandler =
  (readLocale: () => Promise<string>) =>
  (run: (body: Record<string, unknown>) => Promise<Record<string, unknown>>) =>
  async (payload: RoutePayload) => {
    try {
      return jsonResponse(200, await run(readBody(payload)));
    } catch (error) {
      const locale = await readLocale().catch(() => 'en');

      if (error instanceof RolesUserError) {
        return jsonResponse(error.status, { error: translate(locale, error.message, error.values) });
      }
      if (error instanceof NoPersonBehindRequestError) {
        return jsonResponse(403, { error: translate(locale, ROLES_MESSAGES.notAdmin) });
      }
      if (error instanceof RoleSyncBusyError) {
        return jsonResponse(409, { error: translate(locale, error.message) });
      }
      if (error instanceof GraphqlForbiddenError) {
        return notAllowedResponse(locale, error);
      }

      return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
    }
  };

export const rolesRouteHandler = makeRolesRouteHandler(readUserLocale);
