import { describe, expect, it } from 'vitest';

import { type OrderSaveContext } from 'src/fieldservice/types/order-save-context.type';
import { type OrderState } from 'src/fieldservice/types/order-state.type';
import { planOrderSave } from 'src/fieldservice/utils/plan-order-save.util';

const order = (values: Partial<OrderState> = {}): OrderState => ({
  id: 'order-1',
  name: 'FO001',
  stage: 'NEW',
  closedStatus: 'OPEN',
  priority: 'NORMAL',
  teamId: 'team-default',
  locationId: null,
  locationDirections: null,
  requestEarly: '2026-10-20T08:00:00.000Z',
  requestLate: '2026-10-23T08:00:00.000Z',
  personId: null,
  scheduledDateStart: null,
  scheduledDuration: 0,
  scheduledDateEnd: null,
  dateStart: null,
  dateEnd: null,
  duration: 0,
  territoryId: null,
  branchId: null,
  districtId: null,
  regionId: null,
  templateId: null,
  todo: null,
  ...values,
});

const context = (values: Partial<OrderSaveContext> = {}): OrderSaveContext => ({
  now: '2026-10-20T08:15:42.000Z',
  location: null,
  teamsBySequence: [{ id: 'team-default' }, { id: 'team-night' }],
  templateInstructions: null,
  holidays: [],
  hoursByPriority: [72, 48, 24, 8],
  ...values,
});

const siteLocation = {
  teamId: 'team-site',
  completeDirection: 'Gate B; Second floor',
  territoryId: 'territory-1',
  branchId: 'branch-1',
  districtId: 'district-1',
  regionId: 'region-1',
};

describe('planOrderSave', () => {
  it('gives a new order the first team, a request window from now and the open status', () => {
    const plan = planOrderSave({
      before: null,
      after: order({ teamId: null, requestEarly: null, requestLate: null, closedStatus: null }),
      written: new Set(),
      staffSave: true,
      context: context(),
    });

    expect(plan).toEqual({
      kind: 'write',
      data: {
        teamId: 'team-default',
        requestEarly: '2026-10-20T08:15:00.000Z',
        requestLate: '2026-10-23T08:15:00.000Z',
        closedStatus: 'OPEN',
      },
    });
  });

  it('waits 8 hours for an urgent new order', () => {
    const plan = planOrderSave({
      before: null,
      after: order({ priority: 'URGENT', requestEarly: '2026-10-20T08:00:00.000Z', requestLate: null }),
      written: new Set(),
      staffSave: true,
      context: context(),
    });

    expect(plan).toMatchObject({ kind: 'write', data: { requestLate: '2026-10-20T16:00:00.000Z' } });
  });

  it('gives a new order at a location the location team, directions and service area', () => {
    const plan = planOrderSave({
      before: null,
      after: order({ teamId: null, locationId: 'location-1' }),
      written: new Set(),
      staffSave: true,
      context: context({ location: siteLocation }),
    });

    expect(plan).toEqual({
      kind: 'write',
      data: {
        teamId: 'team-site',
        locationDirections: 'Gate B; Second floor',
        territoryId: 'territory-1',
        branchId: 'branch-1',
        districtId: 'district-1',
        regionId: 'region-1',
      },
    });
  });

  it('refuses a new order when no team exists', () => {
    const plan = planOrderSave({
      before: null,
      after: order({ teamId: null }),
      written: new Set(),
      staffSave: true,
      context: context({ teamsBySequence: [] }),
    });

    expect(plan).toEqual({ kind: 'refuse', reason: 'Create a field service team first.', values: {}, putBack: {} });
  });

  it('puts the stage back when staff move an order to Completed by hand', () => {
    const plan = planOrderSave({
      before: order(),
      after: order({ stage: 'COMPLETED' }),
      written: new Set(['stage']),
      staffSave: true,
      context: context(),
    });

    expect(plan).toEqual({
      kind: 'refuse',
      reason: 'Only the Complete button moves a service order to Completed.',
      values: {},
      putBack: { stage: 'NEW' },
    });
  });

  it('refuses a new order made straight into Completed, and lets one made in Cancelled stand', () => {
    const completed = planOrderSave({
      before: null,
      after: order({ stage: 'COMPLETED' }),
      written: new Set(),
      staffSave: true,
      context: context(),
    });
    const cancelled = planOrderSave({
      before: null,
      after: order({ stage: 'CANCELLED' }),
      written: new Set(),
      staffSave: true,
      context: context(),
    });

    expect(completed).toMatchObject({ kind: 'refuse', reason: 'Only the Complete button moves a service order to Completed.', putBack: {} });
    expect(cancelled).toMatchObject({ kind: 'write' });
  });

  it('closes an order the Complete button moved to Completed', () => {
    const plan = planOrderSave({
      before: order(),
      after: order({ stage: 'COMPLETED' }),
      written: new Set(['stage', 'closedStatus']),
      staffSave: false,
      context: context(),
    });

    expect(plan).toEqual({ kind: 'write', data: { closedStatus: 'COMPLETED' } });
  });

  it('lets staff cancel an order', () => {
    const plan = planOrderSave({
      before: order(),
      after: order({ stage: 'CANCELLED' }),
      written: new Set(['stage']),
      staffSave: true,
      context: context(),
    });

    expect(plan).toEqual({ kind: 'write', data: { closedStatus: 'CANCELLED' } });
  });

  it('pulls the start back from a written end by the stored duration', () => {
    const plan = planOrderSave({
      before: order({ scheduledDuration: 2 }),
      after: order({ scheduledDuration: 2, scheduledDateEnd: '2026-10-20T11:00:00.000Z' }),
      written: new Set(['scheduledDateEnd']),
      staffSave: true,
      context: context(),
    });

    expect(plan).toEqual({ kind: 'write', data: { scheduledDateStart: '2026-10-20T09:00:00.000Z' } });
  });

  it('refuses a schedule whose window holds a holiday and puts the written values back', () => {
    const plan = planOrderSave({
      before: order(),
      after: order({ scheduledDateStart: '2026-12-25T07:00:00.000Z', scheduledDateEnd: '2026-12-25T18:00:00.000Z' }),
      written: new Set(['scheduledDateStart', 'scheduledDateEnd']),
      staffSave: true,
      context: context({
        holidays: [{ name: 'Christmas', dateFrom: '2026-12-25T08:00:00.000Z', dateTo: '2026-12-25T17:00:00.000Z' }],
      }),
    });

    expect(plan).toEqual({
      kind: 'refuse',
      reason: '{date} is a holiday: {name}.',
      values: { date: '2026-12-25', name: 'Christmas' },
      putBack: { scheduledDateStart: null, scheduledDateEnd: null },
    });
  });

  it('brings the team and directions of a new location unless staff set them in the same save', () => {
    const moved = planOrderSave({
      before: order(),
      after: order({ locationId: 'location-1' }),
      written: new Set(['location', 'locationId']),
      staffSave: true,
      context: context({ location: siteLocation }),
    });
    const teamKept = planOrderSave({
      before: order(),
      after: order({ locationId: 'location-1', teamId: 'team-night' }),
      written: new Set(['locationId', 'teamId']),
      staffSave: true,
      context: context({ location: siteLocation }),
    });

    expect(moved).toMatchObject({ kind: 'write', data: { teamId: 'team-site', locationDirections: 'Gate B; Second floor' } });
    expect(teamKept).toMatchObject({ kind: 'write', data: { locationDirections: 'Gate B; Second floor' } });
    expect(teamKept.kind === 'write' && 'teamId' in teamKept.data).toBe(false);
  });

  it('copies the instructions of a newly picked template', () => {
    const plan = planOrderSave({
      before: order(),
      after: order({ templateId: 'template-1' }),
      written: new Set(['templateId']),
      staffSave: true,
      context: context({ templateInstructions: 'Check the belt tension' }),
    });

    expect(plan).toEqual({ kind: 'write', data: { todo: 'Check the belt tension' } });
  });

  it('measures the actual duration between the actual start and end', () => {
    const plan = planOrderSave({
      before: order(),
      after: order({ dateStart: '2026-10-20T09:00:00.000Z', dateEnd: '2026-10-20T11:30:00.000Z' }),
      written: new Set(['dateStart', 'dateEnd']),
      staffSave: true,
      context: context(),
    });

    expect(plan).toEqual({ kind: 'write', data: { duration: 2.5 } });
  });

  it('writes nothing on a second pass over its own write', () => {
    const plan = planOrderSave({
      before: order({ duration: 0 }),
      after: order({ dateStart: '2026-10-20T09:00:00.000Z', dateEnd: '2026-10-20T11:30:00.000Z', duration: 2.5 }),
      written: new Set(['duration']),
      staffSave: false,
      context: context(),
    });

    expect(plan).toEqual({ kind: 'write', data: {} });
  });
});
