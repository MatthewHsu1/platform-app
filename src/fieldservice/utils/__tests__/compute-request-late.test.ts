import { describe, expect, it } from 'vitest';

import type { RequestPriority } from 'src/fieldservice/types/request-priority.type';
import { computeRequestLate } from 'src/fieldservice/utils/compute-request-late.util';

describe('computeRequestLate', () => {
  it.each<[RequestPriority, string]>([
    ['normal', '2026-10-23T09:00:00.000Z'],
    ['low', '2026-10-22T09:00:00.000Z'],
    ['high', '2026-10-21T09:00:00.000Z'],
    ['urgent', '2026-10-20T17:00:00.000Z'],
  ])('priority %s from 2026-10-20T09:00 gives %s', (priority, expected) => {
    expect(computeRequestLate('2026-10-20T09:00:00.000Z', priority, [72, 48, 24, 8])).toBe(expected);
  });
});
