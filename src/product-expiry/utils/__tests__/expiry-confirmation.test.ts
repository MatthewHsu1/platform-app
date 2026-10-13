import { describe, expect, it } from 'vitest';

import {
  expiryConfirmationNeeded,
  lotsToRemind,
  planDiscardExpired,
} from 'src/product-expiry/utils/expiry-confirmation.util';
import { type ExpiryLine } from 'src/product-expiry/utils/types/expiry-line.type';

const now = new Date('2025-03-10T12:00:00.000Z');
const line = (fields: Partial<ExpiryLine>): ExpiryLine => ({
  id: 'l1',
  pickingId: 'out1',
  productName: 'Apple',
  lotId: 'good',
  lotName: 'good-apple-lot',
  lotExpirationDate: '2025-03-20T12:00:00.000Z',
  removalDate: '2025-03-18T12:00:00.000Z',
  useExpirationDate: true,
  ...fields,
});
const expired = {
  lotId: 'old',
  lotName: 'expired-apple-lot-01',
  lotExpirationDate: '2025-02-28T12:00:00.000Z',
  removalDate: '2025-02-26T12:00:00.000Z',
};

describe('expiryConfirmationNeeded', () => {
  it('asks nothing when every lot is good', () => {
    expect(expiryConfirmationNeeded([line({})], now)).toBeNull();
  });

  it('asks when a line has an expired lot, with or without good lines', () => {
    expect(expiryConfirmationNeeded([line({}), line({ id: 'l2', ...expired })], now)).toEqual({
      pickingIds: ['out1'],
      lotIds: ['old'],
      productName: 'Apple',
      lotName: 'expired-apple-lot-01',
    });
    expect(expiryConfirmationNeeded([line({ ...expired })], now)?.lotIds).toEqual(['old']);
  });

  it('asks for a line whose removal date passed, naming the lot it will make', () => {
    expect(
      expiryConfirmationNeeded(
        [line({ lotId: null, lotName: 'new-expired-lot', lotExpirationDate: null, removalDate: '2025-03-09T12:00:00.000Z' })],
        now,
      ),
    ).toEqual({ pickingIds: ['out1'], lotIds: [], productName: 'Apple', lotName: 'new-expired-lot' });
  });

  it('names the one expired lot even when a line without a lot comes first', () => {
    expect(
      expiryConfirmationNeeded(
        [
          line({ id: 'l0', lotId: null, lotName: 'new-expired-lot', lotExpirationDate: null, removalDate: '2025-03-09T12:00:00.000Z' }),
          line({ id: 'l2', ...expired }),
        ],
        now,
      ),
    ).toEqual({ pickingIds: ['out1'], lotIds: ['old'], productName: 'Apple', lotName: 'expired-apple-lot-01' });
  });
});

describe('planDiscardExpired', () => {
  it('drops lines of expiry products whose removal date has passed', () => {
    expect(
      planDiscardExpired(
        [line({}), line({ id: 'l2', ...expired }), line({ id: 'l3', ...expired, useExpirationDate: false })],
        now,
      ),
    ).toEqual(['l2']);
  });

  it('keeps a line whose removal date is this very moment', () => {
    expect(planDiscardExpired([line({ id: 'l2', ...expired, removalDate: now.toISOString() })], now)).toEqual([]);
  });

  it('drops nothing when no line has a removal date', () => {
    expect(planDiscardExpired([line({ removalDate: null, lotExpirationDate: '2025-03-01T00:00:00.000Z' })], now)).toEqual([]);
  });
});

describe('lotsToRemind', () => {
  const today = new Date('2025-03-10T08:00:00.000Z');

  it('reminds once for a lot in stock whose alert date has come', () => {
    expect(
      lotsToRemind(
        [
          { id: 'past', alertDate: '2025-02-23T00:00:00.000Z', productExpiryReminded: false },
          { id: 'ahead', alertDate: '2025-03-25T00:00:00.000Z', productExpiryReminded: false },
          { id: 'none', alertDate: null, productExpiryReminded: false },
          { id: 'done', alertDate: '2025-02-23T00:00:00.000Z', productExpiryReminded: true },
          { id: 'empty', alertDate: '2025-02-23T00:00:00.000Z', productExpiryReminded: false },
        ],
        new Set(['past', 'ahead', 'none', 'done']),
        today,
      ),
    ).toEqual(['past']);
  });
});
