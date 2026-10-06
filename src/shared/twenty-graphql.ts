export type GraphqlCaller = 'person' | 'application';

export type GraphqlError = {
  message: string;
  extensions?: Record<string, unknown>;
};

export type GraphqlResponse<TData> = {
  data?: TData | null;
  errors?: GraphqlError[];
};

const TOKEN_ENV_NAME_BY_CALLER: Record<GraphqlCaller, string> = {
  person: 'TWENTY_APP_ACCESS_TOKEN',
  application: 'TWENTY_APP_APPLICATION_ACCESS_TOKEN',
};

const post = async <TData>(
  path: '/graphql' | '/metadata',
  caller: GraphqlCaller,
  query: string,
  variables?: Record<string, unknown>,
): Promise<GraphqlResponse<TData>> => {
  const response = await fetch(`${process.env.TWENTY_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env[TOKEN_ENV_NAME_BY_CALLER[caller]]}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  return (await response.json()) as GraphqlResponse<TData>;
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

export const requireData = <TData>(
  response: GraphqlResponse<TData>,
  what: string,
): TData => {
  if (response.data === undefined || response.data === null || response.errors !== undefined) {
    throw new Error(`${what}: ${describeGraphqlErrors(response.errors)}`);
  }

  return response.data;
};
