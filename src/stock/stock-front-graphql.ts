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
  const body = (await response.json()) as { data?: TData | null; errors?: { message: string }[] };

  if (body.data === undefined || body.data === null || body.errors !== undefined) {
    throw new Error((body.errors ?? []).map((error) => error.message).join('; ') || 'no data');
  }

  return body.data;
};
