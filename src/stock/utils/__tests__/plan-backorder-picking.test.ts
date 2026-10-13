import { describe, expect, it } from 'vitest';

import { planBackorderPicking } from 'src/stock/utils/plan-backorder-picking.util';
import { type PickingRow } from 'src/stock/types/picking-row.type';

const original: PickingRow = {
  id: 'out1',
  name: 'WH/OUT/00001',
  origin: 'SO001',
  state: 'DONE',
  priority: 'URGENT',
  scheduledDate: '2026-10-08T09:00:00.000Z',
  dateDeadline: '2026-10-10T09:00:00.000Z',
  hasDeadlineIssue: false,
  delayAlertDate: null,
  dateDone: '2026-10-08T12:00:00.000Z',
  locationId: 'stock',
  locationDestId: 'customers',
  pickingTypeId: 'out-type',
  pickingTypeCode: 'OUTGOING',
  companyId: 'acme',
  personId: 'jane',
  responsibleUserId: 'member-1',
  ownerId: null,
  printed: true,
  isLocked: true,
  moveType: 'DIRECT',
  backorderId: null,
  returnPickingId: 'in7',
  createdAt: '2026-10-07T09:00:00.000Z',
};

describe('planBackorderPicking', () => {
  it('copies the transfer fields, links the original and the return, and leaves the copy=False fields out', () => {
    expect(planBackorderPicking({ original, note: 'Fragile', name: 'WH/OUT/00002' })).toEqual({
      name: 'WH/OUT/00002',
      origin: 'SO001',
      note: 'Fragile',
      moveType: 'DIRECT',
      priority: 'URGENT',
      scheduledDate: '2026-10-08T09:00:00.000Z',
      dateDeadline: '2026-10-10T09:00:00.000Z',
      locationId: 'stock',
      locationDestId: 'customers',
      pickingTypeId: 'out-type',
      pickingTypeCode: 'OUTGOING',
      companyId: 'acme',
      personId: 'jane',
      ownerId: null,
      backorderId: 'out1',
      returnPickingId: 'in7',
    });
  });
});
