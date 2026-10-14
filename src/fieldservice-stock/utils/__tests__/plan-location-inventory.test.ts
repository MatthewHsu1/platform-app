import { describe, expect, it } from 'vitest';

import { type LocationInventoryInput } from 'src/fieldservice-stock/types/location-inventory-input.type';
import { planLocationInventory } from 'src/fieldservice-stock/utils/plan-location-inventory.util';

const row = (id: string, parentId: string | null, inventoryLocationId: string | null, partnerLocationId: string | null = null) => ({
  id,
  parentId,
  inventoryLocationId,
  partnerLocationId,
});
const base = { created: [], parentWritten: [], inventoryWritten: [], defaultLocationId: 'customers' } satisfies Omit<LocationInventoryInput, 'rows'>;
const byId = (writes: { id: string }[]) => [...writes].sort((left, right) => left.id.localeCompare(right.id));

describe('planLocationInventory', () => {
  it('gives a new root location Customers, or the customer location of the contact it was made from', () => {
    expect(planLocationInventory({ ...base, rows: [row('home', null, null)], created: ['home'] })).toEqual([{ id: 'home', inventoryLocationId: 'customers' }]);
    expect(planLocationInventory({ ...base, rows: [row('home', null, null, 'van')], created: ['home'] })).toEqual([
      { id: 'home', inventoryLocationId: 'van' },
    ]);
  });

  it('gives a new location the stock location of its parent, and keeps one it was made with', () => {
    const rows = [row('site', null, 'depot'), row('room', 'site', null), row('closet', 'site', 'shelf')];

    expect(planLocationInventory({ ...base, rows, created: ['room', 'closet'] })).toEqual([{ id: 'room', inventoryLocationId: 'depot' }]);
  });

  it('gives a new location and its new parent the same value when both are made together', () => {
    const rows = [row('room', 'site', null), row('site', null, null)];

    expect(byId(planLocationInventory({ ...base, rows, created: ['site', 'room'] }))).toEqual([
      { id: 'room', inventoryLocationId: 'customers' },
      { id: 'site', inventoryLocationId: 'customers' },
    ]);
  });

  it('fills a location that has none, cleared by staff or older than the module, the same way', () => {
    const rows = [row('site', null, 'depot'), row('room', 'site', null), row('lone', null, null)];

    expect(byId(planLocationInventory({ ...base, rows, inventoryWritten: ['room'] }))).toEqual([
      { id: 'lone', inventoryLocationId: 'customers' },
      { id: 'room', inventoryLocationId: 'depot' },
    ]);
  });

  it('moves a location and everything below it to the stock location of the new parent', () => {
    const rows = [row('other', null, 'van'), row('room', 'other', 'depot'), row('closet', 'room', 'depot')];

    expect(byId(planLocationInventory({ ...base, rows, parentWritten: ['room'] }))).toEqual([
      { id: 'closet', inventoryLocationId: 'van' },
      { id: 'room', inventoryLocationId: 'van' },
    ]);
  });

  it('hands a changed stock location down to every location below, even one set by hand', () => {
    const rows = [row('site', null, 'van'), row('room', 'site', 'depot'), row('closet', 'room', 'shelf')];

    expect(byId(planLocationInventory({ ...base, rows, inventoryWritten: ['site'] }))).toEqual([
      { id: 'closet', inventoryLocationId: 'van' },
      { id: 'room', inventoryLocationId: 'van' },
    ]);
  });

  it('keeps the value written in this batch for that location and passes it on below', () => {
    const rows = [row('site', null, 'van'), row('room', 'site', 'shelf'), row('closet', 'room', 'depot')];

    expect(planLocationInventory({ ...base, rows, inventoryWritten: ['site', 'room'] })).toEqual([{ id: 'closet', inventoryLocationId: 'shelf' }]);
  });

  it('leaves a location that differs from its parent alone when nothing about the parent changed', () => {
    const rows = [row('site', null, 'depot'), row('room', 'site', 'shelf')];

    expect(planLocationInventory({ ...base, rows, inventoryWritten: ['room'] })).toEqual([]);
  });

  it('fills a new parent that has none and moves the location under it to the same value', () => {
    const rows = [row('other', null, null), row('room', 'other', 'depot')];

    expect(byId(planLocationInventory({ ...base, rows, parentWritten: ['room'] }))).toEqual([
      { id: 'other', inventoryLocationId: 'customers' },
      { id: 'room', inventoryLocationId: 'customers' },
    ]);
  });
});
