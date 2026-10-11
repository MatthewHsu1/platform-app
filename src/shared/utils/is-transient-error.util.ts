import { CONFLICT_MESSAGES } from 'src/shared/triggers/retry-on-conflict';
import { RATE_LIMIT_MESSAGE } from 'src/shared/twenty-graphql';

// Node's answer when the connection to the server drops.
const NETWORK_MESSAGE = 'fetch failed';

// Errors that a later run of the same work can get past.
export const isTransientError = (error: unknown) => {
  const message = error instanceof Error ? error.message : '';

  return [...CONFLICT_MESSAGES, RATE_LIMIT_MESSAGE, NETWORK_MESSAGE].some((text) => message.includes(text));
};
