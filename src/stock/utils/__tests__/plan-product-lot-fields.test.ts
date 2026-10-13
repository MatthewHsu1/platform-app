import { describe, expect, it } from 'vitest';

import { planProductLotFields } from 'src/stock/utils/plan-product-lot-fields.util';
import { type ProductLotFields } from 'src/stock/utils/types/product-lot-fields.type';

const seed = { id: 'seed', prefix: '' };
const product = (fields: Partial<ProductLotFields>): ProductLotFields => ({
  isStorable: true,
  tracking: 'LOT',
  useExpirationDate: false,
  lotSequenceId: 'seed',
  serialPrefixFormat: '',
  ...fields,
});

describe('planProductLotFields', () => {
  it('gives a new product the default serial sequence', () => {
    expect(
      planProductLotFields({
        operation: 'created',
        before: null,
        after: product({ lotSequenceId: null, serialPrefixFormat: null }),
        productName: 'Bike',
        isStaffChange: true,
        sequences: [seed],
        seedSequence: seed,
      }),
    ).toEqual({ data: { lotSequenceId: 'seed' }, createSequence: null });
  });

  it('keeps the sequence a new product was saved with and shows its prefix', () => {
    expect(
      planProductLotFields({
        operation: 'created',
        before: null,
        after: product({ lotSequenceId: 'x', serialPrefixFormat: null }),
        productName: 'Bike',
        isStaffChange: true,
        sequences: [seed, { id: 'x', prefix: 'X/' }],
        seedSequence: seed,
      }),
    ).toEqual({ data: { serialPrefixFormat: 'X/' }, createSequence: null });
  });

  it('applies a prefix typed when the product is created', () => {
    expect(
      planProductLotFields({
        operation: 'created',
        before: null,
        after: product({ lotSequenceId: null, serialPrefixFormat: 'SN-' }),
        productName: 'Bike',
        isStaffChange: true,
        sequences: [seed, { id: 'sn', prefix: 'SN-' }],
        seedSequence: seed,
      }),
    ).toEqual({ data: { lotSequenceId: 'sn' }, createSequence: null });
  });

  it('clears expiry dates when tracking is set to By Quantity', () => {
    expect(
      planProductLotFields({
        operation: 'updated',
        before: product({ useExpirationDate: true }),
        after: product({ tracking: 'NONE', useExpirationDate: true }),
        productName: 'Apple',
        isStaffChange: true,
        sequences: [seed],
        seedSequence: seed,
      }).data,
    ).toEqual({ useExpirationDate: false });
  });

  it('stops tracking a product that is no longer storable', () => {
    expect(
      planProductLotFields({
        operation: 'updated',
        before: product({}),
        after: product({ isStorable: false }),
        productName: 'Apple',
        isStaffChange: false,
        sequences: [seed],
        seedSequence: seed,
      }).data,
    ).toEqual({ tracking: 'NONE' });
  });

  it('turns expiry dates off with the tracking of a product that is no longer storable', () => {
    expect(
      planProductLotFields({
        operation: 'updated',
        before: product({ useExpirationDate: true }),
        after: product({ isStorable: false, useExpirationDate: true }),
        productName: 'Apple',
        isStaffChange: false,
        sequences: [seed],
        seedSequence: seed,
      }).data,
    ).toEqual({ tracking: 'NONE', useExpirationDate: false });
  });

  it('keeps expiry dates on a product saved without tracking from the start', () => {
    expect(
      planProductLotFields({
        operation: 'created',
        before: null,
        after: product({ tracking: 'NONE', useExpirationDate: true }),
        productName: 'Apple',
        isStaffChange: true,
        sequences: [seed],
        seedSequence: seed,
      }).data,
    ).toEqual({});
  });

  it('uses the sequence that already has a typed prefix', () => {
    expect(
      planProductLotFields({
        operation: 'updated',
        before: product({}),
        after: product({ serialPrefixFormat: 'SN-' }),
        productName: 'Bike',
        isStaffChange: true,
        sequences: [seed, { id: 'sn', prefix: 'SN-' }],
        seedSequence: seed,
      }),
    ).toEqual({ data: { lotSequenceId: 'sn' }, createSequence: null });
  });

  it('makes a sequence for a new prefix', () => {
    expect(
      planProductLotFields({
        operation: 'updated',
        before: product({}),
        after: product({ serialPrefixFormat: 'BK-' }),
        productName: 'Bike',
        isStaffChange: true,
        sequences: [seed],
        seedSequence: seed,
      }),
    ).toEqual({
      data: {},
      createSequence: { name: 'Bike Serial Sequence', code: 'stock.lot.serial', prefix: 'BK-', padding: 7 },
    });
  });

  it('goes back to the default sequence when the prefix is emptied', () => {
    expect(
      planProductLotFields({
        operation: 'updated',
        before: product({ lotSequenceId: 'sn', serialPrefixFormat: 'SN-' }),
        after: product({ lotSequenceId: 'sn', serialPrefixFormat: '' }),
        productName: 'Bike',
        isStaffChange: true,
        sequences: [seed, { id: 'sn', prefix: 'SN-' }],
        seedSequence: seed,
      }).data,
    ).toEqual({ lotSequenceId: 'seed' });
  });

  it('shows the prefix of a sequence picked by hand', () => {
    expect(
      planProductLotFields({
        operation: 'updated',
        before: product({}),
        after: product({ lotSequenceId: 'x' }),
        productName: 'Bike',
        isStaffChange: true,
        sequences: [seed, { id: 'x', prefix: 'X/' }],
        seedSequence: seed,
      }).data,
    ).toEqual({ serialPrefixFormat: 'X/' });
  });

  it('finds nothing to write on a second pass', () => {
    expect(
      planProductLotFields({
        operation: 'updated',
        before: product({}),
        after: product({ lotSequenceId: 'sn', serialPrefixFormat: 'SN-' }),
        productName: 'Bike',
        isStaffChange: false,
        sequences: [seed, { id: 'sn', prefix: 'SN-' }],
        seedSequence: seed,
      }),
    ).toEqual({ data: {}, createSequence: null });
  });
});
