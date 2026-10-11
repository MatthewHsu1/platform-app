import { describe, expect, it } from 'vitest';

import { distinctIds } from 'src/shared/utils/distinct-ids.util';

describe('distinctIds', () => {
  it('keeps each set id once, in the order first seen', () => {
    expect(distinctIds(['b', null, 'a', undefined, 'b'])).toEqual(['b', 'a']);
  });
});
