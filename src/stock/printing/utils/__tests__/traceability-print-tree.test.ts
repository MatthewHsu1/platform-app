import { describe, expect, it } from 'vitest';

import { shownOpenLineIds, unfoldPrintRows } from 'src/stock/printing/utils/traceability-print-tree.util';
import { type TraceRow } from 'src/stock/utils/types/trace-row.type';

const row = (lineId: string, unfoldable = true): TraceRow => ({
  lineId,
  reference: lineId,
  referenceRecord: null,
  productName: '',
  date: '2026-10-11T00:00:00.000Z',
  lotId: null,
  lotName: '',
  from: '',
  fromRecord: null,
  to: '',
  toRecord: null,
  quantity: '',
  quantityValue: 0,
  uomName: '',
  usage: 'internal',
  unfoldable,
  pickingId: null,
});

describe('unfoldPrintRows', () => {
  it('prints the unfolded rows under their parent, one level deeper', async () => {
    const children: Record<string, TraceRow[]> = { a: [row('b')], b: [row('c', false)] };
    const lines = await unfoldPrintRows([row('a'), row('x')], ['a', 'b'], async (lineId) => children[lineId] ?? []);

    expect(lines.map((line) => [line.row.lineId, line.level])).toEqual([
      ['a', 1],
      ['b', 2],
      ['c', 3],
      ['x', 1],
    ]);
  });

  it('stops when a line comes back under itself', async () => {
    const children: Record<string, TraceRow[]> = { a: [row('b')], b: [row('a')] };
    const lines = await unfoldPrintRows([row('a')], ['a', 'b'], async (lineId) => children[lineId] ?? []);

    expect(lines.map((line) => [line.row.lineId, line.level])).toEqual([
      ['a', 1],
      ['b', 2],
      ['a', 3],
    ]);
  });
});

describe('shownOpenLineIds', () => {
  it('keeps an unfolded row only when every row above it is unfolded too', () => {
    expect(shownOpenLineIds({ '/a': true, '/a/b': true, '/c': false, '/c/d': true, '/e': false })).toEqual(['a', 'b']);
  });
});
