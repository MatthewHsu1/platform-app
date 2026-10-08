import { RestApiClientError } from 'twenty-client-sdk/rest';

export const describeRouteError = (error: unknown, fallback: string) => {
  if (error instanceof RestApiClientError) {
    const body = error.body as { error?: unknown } | undefined;

    if (typeof body?.error === 'string') {
      return body.error;
    }
  }

  return fallback;
};
