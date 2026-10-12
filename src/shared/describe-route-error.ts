import { RestApiClientError } from 'twenty-client-sdk/rest';

import { QueryAsUserError } from 'src/shared/front-components/query-as-user';

export const describeRouteError = (error: unknown, fallback: string) => {
  if (error instanceof RestApiClientError) {
    const body = error.body as { error?: unknown } | undefined;

    if (typeof body?.error === 'string') {
      return body.error;
    }
  }

  if (error instanceof QueryAsUserError) {
    return error.message;
  }

  return fallback;
};
