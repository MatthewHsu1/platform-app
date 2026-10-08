import {
  type TemplateAttributeValueRecord,
  type TemplateState,
  type VariantRow,
} from 'src/product/variant/template-state.type';

const usd = (amount: number) => ({ amountMicros: amount * 1_000_000, currencyCode: 'USD' });

export const templateAttributeValue = (
  id: string,
  lineId: string,
  valueId: string,
  overrides: Partial<TemplateAttributeValueRecord> = {},
): TemplateAttributeValueRecord => ({
  id,
  name: null,
  ptavActive: true,
  productAttributeValueId: valueId,
  attributeLineId: lineId,
  productTmplId: 'shirt',
  priceExtra: usd(0),
  deletedAt: null,
  ...overrides,
});

export const variant = (id: string, overrides: Partial<VariantRow> = {}): VariantRow => ({
  id,
  name: null,
  active: true,
  defaultCode: null,
  barcode: null,
  standardPrice: usd(0),
  weight: null,
  volume: null,
  priceExtra: null,
  lstPrice: null,
  combinationIndices: null,
  createdAt: '2026-10-08T00:00:00.000Z',
  deletedAt: null,
  ...overrides,
});

const value = (id: string, name: string, sequence: number) => [id, { id, name, sequence, defaultExtraPrice: usd(0) }] as const;

// Shirt from the spec's walk-through: Size S, M, L (L costs 2.00 more) and
// Color Red, Blue, sales price 20.00, one variant per combination.
export const shirtState = (): TemplateState => ({
  template: {
    id: 'shirt',
    name: 'Shirt',
    active: true,
    defaultCode: null,
    barcode: null,
    standardPrice: usd(0),
    weight: null,
    volume: null,
    listPrice: usd(20),
  },
  lines: [
    { id: 'lineSize', name: null, active: true, sequence: 10, valueCount: null, productTmplId: 'shirt', attributeId: 'size' },
    { id: 'lineColor', name: null, active: true, sequence: 20, valueCount: null, productTmplId: 'shirt', attributeId: 'color' },
  ],
  lineValueLinks: [
    ['lineSize', 'valueS'],
    ['lineSize', 'valueM'],
    ['lineSize', 'valueL'],
    ['lineColor', 'valueRed'],
    ['lineColor', 'valueBlue'],
  ].map(([lineId, valueId]) => ({
    id: `${lineId}-${valueId}`,
    productTemplateAttributeLineId: lineId,
    productAttributeValueId: valueId,
  })),
  attributes: new Map([
    ['size', { id: 'size', name: 'Size', sequence: 20, createVariant: 'ALWAYS' }],
    ['color', { id: 'color', name: 'Color', sequence: 20, createVariant: 'ALWAYS' }],
  ]),
  attributeValues: new Map([
    value('valueS', 'S', 1),
    value('valueM', 'M', 2),
    value('valueL', 'L', 3),
    value('valueRed', 'Red', 1),
    value('valueBlue', 'Blue', 2),
  ]),
  templateAttributeValues: [
    templateAttributeValue('S', 'lineSize', 'valueS'),
    templateAttributeValue('M', 'lineSize', 'valueM'),
    templateAttributeValue('L', 'lineSize', 'valueL', { priceExtra: usd(2) }),
    templateAttributeValue('Red', 'lineColor', 'valueRed'),
    templateAttributeValue('Blue', 'lineColor', 'valueBlue'),
  ],
  otherTemplateAttributeValues: [],
  exclusions: [],
  exclusionLinks: [],
  variants: [variant('vLBlue')],
  combinations: [
    { id: 'c1', productProductId: 'vLBlue', productTemplateAttributeValueId: 'L' },
    { id: 'c2', productProductId: 'vLBlue', productTemplateAttributeValueId: 'Blue' },
  ],
});
