import { type RoutePayload } from 'twenty-sdk/define';

import { readCallerAccessOrNull } from 'src/roles/read-caller-access';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { NOT_ALLOWED_MESSAGE, notAllowedResponse } from 'src/shared/not-allowed';
import { jsonResponse, readBody } from 'src/shared/route-response';
import { GraphqlForbiddenError } from 'src/shared/twenty-graphql';
import { UserError } from 'src/shared/user-error';

type RouteResponse = ReturnType<typeof jsonResponse>;

export const NO_MEMBER_DETAIL = 'This action needs a signed-in person: an API key cannot use it.';

// Twenty runs a route called with an API key on the app's own token: the key's role never reaches the
// reads and writes the route makes, so its rights cannot be checked. Every button route refuses such a
// call before it reads or writes anything. Only Twenty's "nobody signed in" answer counts as no member;
// any other failure of that read fails the route.
export const hasMemberBehind = async () => ((await readCallerAccessOrNull())?.workspaceMemberId ?? null) !== null;

// A read or write the user's role does not allow answers 409 with a plain sentence; any other failure 500.
export const makeRouteErrors =
  (readLocale: () => Promise<string>, memberBehind: () => Promise<boolean>) =>
  (handler: (payload: RoutePayload) => Promise<RouteResponse>) =>
  async (payload: RoutePayload) => {
    try {
      if (!(await memberBehind())) {
        const locale = await readLocale().catch(() => 'en');

        return jsonResponse(409, { error: translate(locale, NOT_ALLOWED_MESSAGE), detail: translate(locale, NO_MEMBER_DETAIL) });
      }
      return await handler(payload);
    } catch (error) {
      if (error instanceof GraphqlForbiddenError) {
        return notAllowedResponse(await readLocale().catch(() => 'en'), error);
      }

      return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
    }
  };

// A route that answers its result with 200. A refusal answers with the status the module gives it (409 when
// it gives none) and its text in the user's language; a role refusal and any other failure as every route.
export const makeRouteHandler =
  (readLocale: () => Promise<string>, memberBehind: () => Promise<boolean>, statusOf: (error: UserError) => number) =>
  (run: (body: Record<string, unknown>) => Promise<Record<string, unknown>>) =>
    makeRouteErrors(readLocale, memberBehind)(async (payload) => {
      try {
        return jsonResponse(200, await run(readBody(payload)));
      } catch (error) {
        if (!(error instanceof UserError)) {
          throw error;
        }
        const locale = await readLocale().catch(() => 'en');

        return jsonResponse(statusOf(error), { ...error.details, error: translate(locale, error.message, error.values) });
      }
    });

export const withRouteErrors = makeRouteErrors(readUserLocale, hasMemberBehind);
