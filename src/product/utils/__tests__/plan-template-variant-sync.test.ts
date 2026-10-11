import { describe, expect, it } from 'vitest';

import {
  fieldsNotEdited,
  planEditSync,
  planTemplateVariantSync,
  staffEditOf,
  syncValuesOf,
} from 'src/product/utils/plan-template-variant-sync.util';

const empty = { defaultCode: null, barcode: null, standardPrice: null, weight: null, volume: null };

describe('planTemplateVariantSync', () => {
  it('copies a product edit to its single variant', () => {
    expect(
      planTemplateVariantSync({
        source: 'template',
        changedFields: ['barcode'],
        template: { ...empty, barcode: '123' },
        variants: [{ id: 'v', active: true, ...empty }],
      }),
    ).toEqual({ template: {}, variant: { id: 'v', data: { barcode: '123' } } });
  });

  it('copies a single variant edit back to the product', () => {
    expect(
      planTemplateVariantSync({
        source: 'variant',
        changedFields: ['weight'],
        template: empty,
        variants: [{ id: 'v', active: true, ...empty, weight: 2.5 }],
      }),
    ).toEqual({ template: { weight: 2.5 }, variant: null });
  });

  it('uses the one archived variant when no variant is active', () => {
    const plan = planTemplateVariantSync({
      source: 'template',
      changedFields: ['defaultCode'],
      template: { ...empty, defaultCode: 'A' },
      variants: [{ id: 'old', active: false, ...empty }],
    });
    expect(plan.variant).toEqual({ id: 'old', data: { defaultCode: 'A' } });
  });

  it('clears the product fields when there are two or more variants', () => {
    expect(
      planTemplateVariantSync({
        source: 'template',
        changedFields: ['barcode'],
        template: { ...empty, barcode: '123' },
        variants: [
          { id: 'a', active: true, ...empty },
          { id: 'b', active: true, ...empty },
        ],
      }),
    ).toEqual({ template: { barcode: null }, variant: null });
  });

  it('writes nothing when both sides already match', () => {
    expect(
      planTemplateVariantSync({
        source: 'variant',
        changedFields: ['barcode'],
        template: { ...empty, barcode: '1' },
        variants: [{ id: 'v', active: true, ...empty, barcode: '1' }],
      }),
    ).toEqual({ template: {}, variant: null });
  });
});

describe('syncValuesOf', () => {
  it('reads cost 0 on the product and no cost on the variant as the same, so nothing is written', () => {
    const product = {
      defaultCode: '',
      barcode: null,
      standardPrice: { amountMicros: 0, currencyCode: 'USD' },
      weight: null,
      volume: null,
    };
    const variant = {
      id: 'v',
      active: true,
      defaultCode: null,
      barcode: '',
      standardPrice: { amountMicros: null, currencyCode: 'USD' },
      weight: null,
      volume: null,
    };

    expect(
      planTemplateVariantSync({
        source: 'variant',
        changedFields: ['defaultCode', 'barcode', 'standardPrice'],
        template: syncValuesOf(product),
        variants: [{ id: variant.id, active: variant.active, ...syncValuesOf(variant) }],
      }),
    ).toEqual({ template: {}, variant: null });
  });
});

describe('planEditSync', () => {
  const t1 = '2026-10-08T10:00:01.000Z';
  const t2 = '2026-10-08T10:00:02.000Z';

  it('variant barcode edited at t1, product name at t2: the new barcode goes to the product', () => {
    expect(
      planEditSync({
        source: 'variant',
        edits: { barcode: { before: 'OLD', after: 'NEW' } },
        sourceSavedAt: t1,
        template: { ...empty, barcode: 'OLD', updatedAt: t2 },
        variants: [{ id: 'v', active: true, ...empty, barcode: 'NEW', updatedAt: t1 }],
      }),
    ).toEqual({ template: { barcode: 'NEW' }, variant: null });
  });

  it('both sides edited on the same field: the later save wins on both, in either order', () => {
    const variantFirst = {
      template: { ...empty, weight: 4, updatedAt: t2 },
      variants: [{ id: 'v', active: true, ...empty, weight: 3, updatedAt: t1 }],
    };

    expect(
      planEditSync({
        source: 'variant',
        edits: { weight: { before: 2, after: 3 } },
        sourceSavedAt: t1,
        ...variantFirst,
      }),
    ).toEqual({ template: {}, variant: { id: 'v', data: { weight: 4 } } });
    expect(
      planEditSync({
        source: 'template',
        edits: { weight: { before: 2, after: 4 } },
        sourceSavedAt: t2,
        ...variantFirst,
      }),
    ).toEqual({ template: {}, variant: { id: 'v', data: { weight: 4 } } });

    const productFirst = {
      template: { ...empty, weight: 4, updatedAt: t1 },
      variants: [{ id: 'v', active: true, ...empty, weight: 3, updatedAt: t2 }],
    };

    expect(
      planEditSync({
        source: 'template',
        edits: { weight: { before: 2, after: 4 } },
        sourceSavedAt: t1,
        ...productFirst,
      }),
    ).toEqual({ template: { weight: 3 }, variant: null });
    expect(
      planEditSync({
        source: 'variant',
        edits: { weight: { before: 2, after: 3 } },
        sourceSavedAt: t2,
        ...productFirst,
      }),
    ).toEqual({ template: { weight: 3 }, variant: null });
  });

  it('writes nothing when the other side already holds the new value', () => {
    expect(
      planEditSync({
        source: 'template',
        edits: { barcode: { before: 'OLD', after: 'NEW' } },
        sourceSavedAt: t2,
        template: { ...empty, barcode: 'NEW', updatedAt: t2 },
        variants: [{ id: 'v', active: true, ...empty, barcode: 'NEW', updatedAt: t1 }],
      }),
    ).toEqual({ template: {}, variant: null });
  });

  it('clears the edited product fields when there are two or more variants', () => {
    expect(
      planEditSync({
        source: 'template',
        edits: { barcode: { before: null, after: '123' } },
        sourceSavedAt: t1,
        template: { ...empty, barcode: '123', updatedAt: t1 },
        variants: [
          { id: 'a', active: true, ...empty, updatedAt: t1 },
          { id: 'b', active: true, ...empty, updatedAt: t1 },
        ],
      }),
    ).toEqual({ template: { barcode: null }, variant: null });
  });
});

describe('staffEditOf', () => {
  const row = (barcode: string | null, updatedAt: string, source = 'API') => ({
    ...empty,
    standardPrice: null,
    barcode,
    updatedAt,
    updatedBy: { source },
  });

  it('takes the value before the first staff save and after the last, and skips the app copies', () => {
    expect(
      staffEditOf('variant', [
        { before: row('A', 't0'), after: row('B', 't1') },
        { before: row('B', 't1'), after: row('C', 't2', 'APPLICATION') },
        { before: row('C', 't2'), after: row('D', 't3') },
      ]),
    ).toEqual({ source: 'variant', edits: { barcode: { before: 'A', after: 'D' } }, savedAt: 't3' });
  });

  it('is null when only the app saved', () => {
    expect(
      staffEditOf('template', [{ before: row('A', 't0'), after: row('B', 't1', 'APPLICATION') }]),
    ).toBeNull();
  });

  it('keeps an empty value before the first save: empty to A, then A to B, edits empty to B', () => {
    expect(
      staffEditOf('template', [
        { before: row(null, 't0'), after: row('A', 't1') },
        { before: row('A', 't1'), after: row('B', 't2') },
      ]),
    ).toEqual({ source: 'template', edits: { barcode: { before: null, after: 'B' } }, savedAt: 't2' });
  });
});

// A product write of { active: true, barcode: 'X' } on an archived
// one-variant product: the barcode is written to the one archived variant,
// then the variants are reconciled and it is reactivated.
describe('unarchive and a synced edit in one save', () => {
  const t1 = '2026-10-08T10:00:01.000Z';
  const edit = { barcode: { before: 'OLD', after: 'X' } };

  it('writes the edit to the one archived variant before the variants are reconciled', () => {
    expect(
      planEditSync({
        source: 'template',
        edits: edit,
        sourceSavedAt: t1,
        template: { ...empty, barcode: 'X', updatedAt: t1 },
        variants: [{ id: 'v', active: false, ...empty, barcode: 'OLD', updatedAt: t1 }],
      }),
    ).toEqual({ template: {}, variant: { id: 'v', data: { barcode: 'X' } } });
  });

  it('leaves the edited fields out of the product-follows-variant copy that runs after', () => {
    expect(fieldsNotEdited({ edits: edit })).toEqual(['defaultCode', 'standardPrice', 'weight', 'volume']);
    expect(
      planTemplateVariantSync({
        source: 'variant',
        changedFields: fieldsNotEdited({ edits: edit }),
        template: { ...empty, barcode: 'X' },
        variants: [{ id: 'v', active: true, ...empty, barcode: 'OLD' }],
      }),
    ).toEqual({ template: {}, variant: null });
  });

  it('copies every synced field when there is no staff edit', () => {
    expect(fieldsNotEdited(undefined)).toEqual(['defaultCode', 'barcode', 'standardPrice', 'weight', 'volume']);
  });
});
