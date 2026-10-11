const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A record id as Twenty writes it; anything else would make a GraphQL id filter fail instead of matching nothing.
export const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
