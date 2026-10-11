import { createHash } from 'node:crypto';

import { uuidFromBytes } from 'src/shared/utils/uuid-from-bytes.util';

// A UUID that depends only on its parts, so a run that stopped half-way finds
// the rows it made instead of making a second set.
export const derivedId = (...parts: string[]) => uuidFromBytes(createHash('sha1').update(parts.join(':')).digest(), 5);
