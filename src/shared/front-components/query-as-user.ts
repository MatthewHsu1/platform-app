type QueryError = { message: string; extensions?: { code?: string; subCode?: string } };

// Twenty's own reason for a failed read; `isRefused` is true when the signed-in person's role
// does not allow it.
export class QueryAsUserError extends Error {
  readonly isRefused: boolean;

  constructor(message: string, isRefused: boolean) {
    super(message);
    this.name = 'QueryAsUserError';
    this.isRefused = isRefused;
  }
}

const isRefusal = (error: QueryError) => error.extensions?.subCode === 'PERMISSION_DENIED' || error.extensions?.code === 'FORBIDDEN';

// Front components read as the clicking user, so row rules apply.
export const queryAsUser = async <TData>(query: string, variables?: Record<string, unknown>): Promise<TData> => {
  const response = await fetch(`${process.env.TWENTY_API_URL}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.TWENTY_APP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as { data?: TData | null; errors?: QueryError[] };

  if (body.data === undefined || body.data === null || body.errors !== undefined) {
    const message = (body.errors ?? []).map((error) => error.message).join('; ') || 'no data';

    throw new QueryAsUserError(message, (body.errors ?? []).some(isRefusal));
  }

  return body.data;
};
