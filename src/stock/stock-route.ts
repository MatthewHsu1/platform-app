import { type RoutePayload } from 'twenty-sdk/define';

import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { jsonResponse, readBody } from 'src/shared/route-response';
import { notAllowedResponse } from 'src/shared/not-allowed';
import { GraphqlForbiddenError } from 'src/shared/twenty-graphql';
import { UserError } from 'src/shared/user-error';
import { ProcurementFailure } from 'src/stock/procurement/apply-procurement-plan';

export const readIds = (body: Record<string, unknown>, name: string) => {
  const value = body[name];

  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : [];
};

export const makeStockRouteHandler =
  (readLocale: () => Promise<string>) =>
  (run: (body: Record<string, unknown>) => Promise<Record<string, unknown>>) =>
  async (payload: RoutePayload) => {
    try {
      return jsonResponse(200, await run(readBody(payload)));
    } catch (error) {
      if (error instanceof ProcurementFailure) {
        const locale = await readLocale().catch(() => 'en');

        return jsonResponse(409, {
          error: error.errors.map((item) => translate(locale, item.message, item.values)).join('\n'),
        });
      }
      // A read or write the user's role does not allow.
      if (error instanceof GraphqlForbiddenError) {
        return notAllowedResponse(await readLocale().catch(() => 'en'), error);
      }
      if (error instanceof UserError) {
        const locale = await readLocale().catch(() => 'en');

        return jsonResponse(409, { ...error.details, error: translate(locale, error.message, error.values) });
      }

      return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
    }
  };

export const stockRouteHandler = makeStockRouteHandler(readUserLocale);
