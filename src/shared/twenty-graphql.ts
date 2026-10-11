export type GraphqlCaller = 'person' | 'application';

export type GraphqlError = {
  message: string;
  extensions?: Record<string, unknown>;
};

// `caller` is the token the call was made with; responses built by hand leave it out.
export type GraphqlResponse<TData> = {
  data?: TData | null;
  errors?: GraphqlError[];
  caller?: GraphqlCaller;
};

const TOKEN_ENV_NAME_BY_CALLER: Record<GraphqlCaller, string> = {
  person: 'TWENTY_APP_ACCESS_TOKEN',
  application: 'TWENTY_APP_APPLICATION_ACCESS_TOKEN',
};

// Twenty allows an app 500 requests a minute (APPLICATION_API_RATE_LIMITING_LIMIT).
// A burst, such as a product import, waits for the window instead of failing.
export const RATE_LIMIT_MESSAGE = 'Rate limit exceeded';
const RATE_LIMIT_WAIT_MS = 5_000;
const RATE_LIMIT_ATTEMPTS = 24;

const isRateLimited = (response: GraphqlResponse<unknown>) =>
  (response.errors ?? []).some((error) => error.message.includes(RATE_LIMIT_MESSAGE));

const post = async <TData>(
  path: '/graphql' | '/metadata',
  caller: GraphqlCaller,
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphqlResponse<TData>> => {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(`${process.env.TWENTY_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env[TOKEN_ENV_NAME_BY_CALLER[caller]]}`,
      },
      body: JSON.stringify({ query, variables }),
    });
    const result = (await response.json()) as GraphqlResponse<TData>;

    if (!isRateLimited(result)) {
      return { ...result, caller };
    }
    if (attempt >= RATE_LIMIT_ATTEMPTS) {
      throw new Error(
        `Twenty's rate limit for apps was still exceeded after ${RATE_LIMIT_ATTEMPTS} tries ${RATE_LIMIT_WAIT_MS / 1_000} s apart: ${describeGraphqlErrors(result.errors)}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_WAIT_MS));
  }
};

export const twentyGraphql = <TData>(
  caller: GraphqlCaller,
  query: string,
  variables?: Record<string, unknown>,
) => post<TData>('/graphql', caller, query, variables);

// Objects, fields and views. The app role needs the Data Model and Views
// permission flags for writes here.
export const twentyMetadata = <TData>(
  caller: GraphqlCaller,
  query: string,
  variables?: Record<string, unknown>,
) => post<TData>('/metadata', caller, query, variables);

export const describeGraphqlErrors = (errors: GraphqlError[] | undefined) =>
  (errors ?? []).map((error) => error.message).join('; ') || 'no data';

// Twenty refused a call made with the clicking user's token because their role lacks the right.
export class GraphqlForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GraphqlForbiddenError';
  }
}

// Twenty answers other errors with the same FORBIDDEN code (a unique key clash, too many rows);
// the sub-code names the cause.
const PERMISSION_DENIED_SUB_CODE = 'PERMISSION_DENIED';

const isPersonRefused = (response: GraphqlResponse<unknown>) =>
  response.caller === 'person' &&
  (response.errors ?? []).some((error) => error.extensions?.subCode === PERMISSION_DENIED_SUB_CODE);

export const requireData = <TData>(
  response: GraphqlResponse<TData>,
  what: string,
): TData => {
  if (response.data === undefined || response.data === null || response.errors !== undefined) {
    const message = `${what}: ${describeGraphqlErrors(response.errors)}`;

    throw isPersonRefused(response) ? new GraphqlForbiddenError(message) : new Error(message);
  }

  return response.data;
};
