import { describe, expect, it } from 'vitest';

import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import { replayedOrderText } from 'src/stock/orderpoint/utils/replayed-order-text.util';

describe('replayedOrderText', () => {
  it('names the quantity, unit and transfer of the order that was finished', () => {
    expect(replayedOrderText({ quantity: 5, unitName: 'Units', pickingName: 'WH/IN/00007' })).toEqual({
      message: ORDERPOINT_MESSAGES.replenishFinishedEarlier,
      values: { quantity: 5, unit: 'Units', transfer: 'WH/IN/00007' },
    });
  });

  it('leaves the transfer out when the order has none', () => {
    expect(replayedOrderText({ quantity: 5, unitName: 'Units', pickingName: null })).toEqual({
      message: ORDERPOINT_MESSAGES.replenishFinishedEarlierNoTransfer,
      values: { quantity: 5, unit: 'Units' },
    });
  });

  it('leaves the unit out when it cannot be read, with or without a transfer', () => {
    expect(replayedOrderText({ quantity: 5, unitName: '', pickingName: 'WH/IN/00007' })).toEqual({
      message: ORDERPOINT_MESSAGES.replenishFinishedEarlierNoUnit,
      values: { quantity: 5, transfer: 'WH/IN/00007' },
    });
    expect(replayedOrderText({ quantity: 5, unitName: '', pickingName: null })).toEqual({
      message: ORDERPOINT_MESSAGES.replenishFinishedEarlierNoTransferNoUnit,
      values: { quantity: 5 },
    });
  });

  it('asks to check the transfers when the finished order cannot be read back', () => {
    expect(replayedOrderText(null)).toEqual({ message: ORDERPOINT_MESSAGES.replenishFinishedEarlierUnread });
  });
});
