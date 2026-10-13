import { describe, expect, it } from 'vitest';

import { type AutoWaveLine } from 'src/stock-picking-batch/types/auto-wave-line.type';
import { type AutoWaveType } from 'src/stock-picking-batch/types/auto-wave-type.type';
import { type ExistingWave } from 'src/stock-picking-batch/types/existing-wave.type';
import { planAutoWave } from 'src/stock-picking-batch/utils/plan-auto-wave.util';

// WH > Stock > Sub Location 1 > Grandchild; Stock > Sub Location 2; WH > Sibling.
const locationParents = new Map<string, string | null>([
  ['wh', null],
  ['stock', 'wh'],
  ['child1', 'stock'],
  ['child2', 'stock'],
  ['grandchild', 'child1'],
  ['sibling', 'wh'],
]);
const locationCompleteNames = new Map([
  ['wh', 'WH'],
  ['stock', 'WH/Stock'],
  ['child1', 'WH/Stock/Sub Location 1'],
  ['child2', 'WH/Stock/Sub Location 2'],
  ['grandchild', 'WH/Stock/Sub Location 1/Grandchild Location'],
  ['sibling', 'WH/Sibling Location'],
]);
const clients = {
  us: { partnerKey: 'us', partnerName: 'US Client', countryKey: 'US', countryName: 'United States' },
  be: { partnerKey: 'be', partnerName: 'BE Client', countryKey: 'BE', countryName: 'Belgium' },
  fr: { partnerKey: 'fr', partnerName: 'FR Client', countryKey: 'FR', countryName: 'France' },
};
const clientOf: Record<string, keyof typeof clients> = { P1: 'us', P2: 'be', P3: 'us', P4: 'be', P5: 'fr' };
// Transfers and moves are made in number order.
const line = (id: string, pickingId: string, moveId: string, productId: string, locationId: string, quantity: number): AutoWaveLine => ({
  id,
  pickingId,
  pickingCreatedAt: `2026-10-01T00:00:0${pickingId.slice(1)}.000Z`,
  moveId,
  moveCreatedAt: `2026-10-01T00:01:${moveId.slice(1)}.000Z`,
  pickingTypeId: 'out',
  pickingState: 'ASSIGNED',
  quantity,
  inWave: false,
  productId,
  productName: `Product ${productId.slice(-1)}`,
  categoryId: 'all',
  categoryCompleteName: 'All',
  locationId,
  locationDestId: 'customers',
  partnerKey: clients[clientOf[pickingId]].partnerKey,
  countryKey: clients[clientOf[pickingId]].countryKey,
  groupValues: { ...clients[clientOf[pickingId]], locationId: 'stock', locationName: 'WH/Stock', locationDestId: 'customers', locationDestName: 'Partners/Customers' },
});
const LINES = [
  line('L01', 'P1', 'M01', 'product1', 'child1', 3),
  line('L02', 'P1', 'M02', 'product1', 'child2', 2),
  line('L03', 'P1', 'M03', 'product2', 'child1', 2),
  line('L04', 'P2', 'M04', 'product1', 'grandchild', 3),
  line('L05', 'P2', 'M05', 'product1', 'child2', 2),
  line('L06', 'P2', 'M06', 'product2', 'child1', 2),
  line('L07', 'P3', 'M07', 'product1', 'stock', 2),
  line('L08', 'P3', 'M08', 'product2', 'child2', 2),
  line('L09', 'P3', 'M09', 'product3', 'grandchild', 3),
  line('L10', 'P4', 'M10', 'product4', 'child1', 3),
  line('L11', 'P5', 'M11', 'product1', 'child1', 3),
  line('L12', 'P5', 'M12', 'product1', 'child2', 2),
  line('L13', 'P5', 'M13', 'product2', 'sibling', 2),
];
const NO_GROUPS: AutoWaveType = {
  autoBatch: true,
  batchGroupByPartner: false,
  batchGroupByDestination: false,
  batchGroupBySrcLoc: false,
  batchGroupByDestLoc: false,
  waveGroupByProduct: false,
  waveGroupByCategory: false,
  waveGroupByLocation: false,
  waveCategoryIds: [],
  waveLocationIds: [],
  batchMaxLines: 0,
  batchMaxPickings: 0,
  batchAutoConfirm: true,
};
const plan = (type: Partial<AutoWaveType>, existingWaves: ExistingWave[] = [], batchesToValidate: string[] = [], lines = LINES) =>
  planAutoWave({
    lines,
    types: new Map([['out', { ...NO_GROUPS, ...type }]]),
    existingWaves,
    locationParents,
    locationCompleteNames,
    skipWaveableCheck: false,
    batchesToValidate,
    digits: 2,
  });
const summary = (result: ReturnType<typeof planAutoWave>) => result.created.map((wave) => ({ description: wave.description, lineIds: [...wave.lineIds].sort() }));
const product2Wave = (id: string, name: string): ExistingWave => ({
  id,
  name,
  pickingTypeId: 'out',
  state: 'IN_PROGRESS',
  moveCount: 1,
  pickingCount: 1,
  lines: [{ locationId: 'child1', productId: 'product2', categoryId: 'all', moveId: 'MW', pickingId: 'PW' }],
  pickingGroups: [],
});

describe('planAutoWave', () => {
  it('group by contact and location (Sub Location 2): three waves', () => {
    expect(summary(plan({ batchGroupByPartner: true, waveGroupByLocation: true, waveLocationIds: ['child2'] }))).toEqual([
      { description: 'US Client, WH/Stock/Sub Location 2', lineIds: ['L02', 'L08'] },
      { description: 'BE Client, WH/Stock/Sub Location 2', lineIds: ['L05'] },
      { description: 'FR Client, WH/Stock/Sub Location 2', lineIds: ['L12'] },
    ]);
  });

  it('group by locations (Stock and Sub Location 1): the nearest wave location wins', () => {
    expect(summary(plan({ waveGroupByLocation: true, waveLocationIds: ['stock', 'child1'] }))).toEqual([
      { description: 'WH/Stock/Sub Location 1', lineIds: ['L01', 'L03', 'L04', 'L06', 'L09', 'L10', 'L11'] },
      { description: 'WH/Stock', lineIds: ['L02', 'L05', 'L07', 'L08', 'L12'] },
    ]);
  });

  it('group by destination country and product: eight waves', () => {
    expect(summary(plan({ batchGroupByDestination: true, waveGroupByProduct: true }))).toEqual([
      { description: 'United States, Product 1', lineIds: ['L01', 'L02', 'L07'] },
      { description: 'United States, Product 2', lineIds: ['L03', 'L08'] },
      { description: 'Belgium, Product 1', lineIds: ['L04', 'L05'] },
      { description: 'France, Product 1', lineIds: ['L11', 'L12'] },
      { description: 'Belgium, Product 2', lineIds: ['L06'] },
      { description: 'United States, Product 3', lineIds: ['L09'] },
      { description: 'Belgium, Product 4', lineIds: ['L10'] },
      { description: 'France, Product 2', lineIds: ['L13'] },
    ]);
  });

  it('only with Automatic Batches: none without it, four by product with it', () => {
    expect(plan({ autoBatch: false, waveGroupByProduct: true }).created).toEqual([]);
    expect(summary(plan({ waveGroupByProduct: true })).map((wave) => wave.description)).toEqual(['Product 1', 'Product 2', 'Product 3', 'Product 4']);
  });

  it('max lines fills new waves in transfer order and starts another when full', () => {
    expect(
      summary(plan({ waveGroupByProduct: true, batchMaxLines: 2 }))
        .filter((wave) => wave.description === 'Product 1')
        .map((wave) => wave.lineIds),
    ).toEqual([['L01', 'L02'], ['L04', 'L05'], ['L07', 'L11'], ['L12']]);
  });

  it('lines join an open wave of the same product; a wave being validated is left out', () => {
    const wave = product2Wave('W1', 'WAVE/00001');

    expect(plan({ waveGroupByProduct: true }, [wave]).existing).toEqual([{ waveId: 'W1', lineIds: ['L03', 'L06', 'L08', 'L13'] }]);
    expect(plan({ waveGroupByProduct: true }, [wave], ['W1']).existing).toEqual([]);
    expect(plan({ waveGroupByProduct: true, batchAutoConfirm: false }, [wave]).existing).toEqual([]);
  });

  it('lines go to the open wave with the highest number first', () => {
    const waves = [product2Wave('W1', 'WAVE/00001'), product2Wave('W2', 'WAVE/00002')];

    expect(plan({ waveGroupByProduct: true }, waves).existing).toEqual([{ waveId: 'W2', lineIds: ['L03', 'L06', 'L08', 'L13'] }]);
  });

  it('a line whose transfer has no contact gets a new wave, not an open one grouped by contact', () => {
    const noContact = { ...LINES[2].groupValues, partnerKey: null, partnerName: null };
    const wave: ExistingWave = { ...product2Wave('W1', 'WAVE/00001'), pickingGroups: [noContact] };
    const result = plan({ batchGroupByPartner: true, waveGroupByProduct: true }, [wave], [], [{ ...LINES[2], partnerKey: null, groupValues: noContact }]);

    expect(result.existing).toEqual([]);
    expect(summary(result)).toEqual([{ description: 'Product 2', lineIds: ['L03'] }]);
  });

  it('two lines of one product with no contact each get a wave of their own when grouping by contact', () => {
    const noContact = (entry: AutoWaveLine): AutoWaveLine => ({
      ...entry,
      partnerKey: null,
      groupValues: { ...entry.groupValues, partnerKey: null, partnerName: null },
    });

    expect(summary(plan({ batchGroupByPartner: true, waveGroupByProduct: true }, [], [], [noContact(LINES[2]), noContact(LINES[5])]))).toEqual([
      { description: 'Product 2', lineIds: ['L03'] },
      { description: 'Product 2', lineIds: ['L06'] },
    ]);
  });

  it("groups by the contact of each line's move, and names the wave after the first line's transfer", () => {
    const lines = [LINES[0], { ...LINES[3], partnerKey: 'us' }];

    expect(summary(plan({ batchGroupByPartner: true, waveGroupByProduct: true }, [], [], lines))).toEqual([
      { description: 'US Client, Product 1', lineIds: ['L01', 'L04'] },
    ]);
  });

  it('skips lines already in a wave, lines of transfers not ready and lines with no quantity', () => {
    const lines = [{ ...LINES[0], inWave: true }, { ...LINES[1], pickingState: 'CONFIRMED' }, { ...LINES[2], quantity: 0 }];

    expect(plan({ waveGroupByProduct: true }, [], [], lines).created).toEqual([]);
  });
});
