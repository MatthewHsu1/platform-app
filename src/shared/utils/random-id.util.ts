import { uuidFromBytes } from 'src/shared/utils/uuid-from-bytes.util';

// Front components run in a worker that is not a secure context, where
// crypto.randomUUID is missing; crypto.getRandomValues works everywhere.
export const randomId = () => uuidFromBytes(crypto.getRandomValues(new Uint8Array(16)), 4);
