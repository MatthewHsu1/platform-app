import { beforeEach, describe, expect, it, vi } from 'vitest';

const personRows: Record<string, Record<string, unknown>[]> = {};
const appRows: Record<string, Record<string, unknown>[]> = {};
const readable: Record<string, string[]> = {};

vi.mock('src/stock/stock-person-writes', () => ({
  findAs: (caller: 'person' | 'application') => async (objectSingular: string) =>
    (caller === 'person' ? personRows : appRows)[objectSingular] ?? [],
}));
vi.mock('src/stock/stock-access', () => ({
  filterReadableIds: async (objectSingular: string, _objectPlural: string, ids: string[]) =>
    ids.filter((id) => (readable[objectSingular] ?? []).includes(id)),
}));

const { recordingFinder, restrictedFinder } = await import('src/stock/printing/print-rows');

const picking = (id: string, personId: string) => ({
  id,
  name: id,
  person: { __typename: 'Person', id: personId, name: { __typename: 'FullName', firstName: 'Ann', lastName: 'Lee' } },
});

beforeEach(() => {
  for (const store of [personRows, appRows, readable]) {
    Object.keys(store).forEach((key) => delete store[key]);
  }
});

describe('print rows', () => {
  it('keeps the rows the user read, and the contacts inside them only when the user may read those too', async () => {
    personRows.stockPicking = [picking('p1', 'ann'), picking('p2', 'bob')];
    readable.person = ['ann'];
    const recorder = recordingFinder();

    await recorder.find('stockPicking', 'stockPickings', {}, 'name person { id name { firstName lastName } }');

    expect(await recorder.rows()).toEqual({ stockPicking: ['p1', 'p2'], person: ['ann'] });
  });

  it('shows on the page only the rows kept, without the contacts the user could not read', async () => {
    appRows.stockPicking = [picking('p1', 'ann'), picking('p2', 'bob'), picking('p3', 'ann')];
    const find = restrictedFinder({ stockPicking: ['p1', 'p2'], person: ['ann'] });
    const rows = await find<{ id: string; person: { id: string } | null }>('stockPicking', 'stockPickings', {}, 'name person { id }');

    expect(rows.map((row) => [row.id, row.person?.id ?? null])).toEqual([
      ['p1', 'ann'],
      ['p2', null],
    ]);
  });

  it('refuses a nested record a row rule may hide when it was read without its id', async () => {
    personRows.stockMoveLine = [{ id: 'l1', lot: { __typename: 'StockLot', name: 'LOT-1' } }];

    await expect(recordingFinder().find('stockMoveLine', 'stockMoveLines', {}, 'lot { name }')).rejects.toThrow(
      'A print read a stockLot inside another record without its id',
    );
  });

  it('keeps a lot on the page when it was read with its id and the user may read it', async () => {
    personRows.stockMoveLine = [{ id: 'l1', lot: { __typename: 'StockLot', id: 'lot1', name: 'LOT-1' } }];
    appRows.stockMoveLine = personRows.stockMoveLine;
    readable.stockLot = ['lot1'];
    const recorder = recordingFinder();

    await recorder.find('stockMoveLine', 'stockMoveLines', {}, 'lot { id name }');
    const rows = await restrictedFinder(await recorder.rows())<{ lot: { name: string } | null }>(
      'stockMoveLine',
      'stockMoveLines',
      {},
      'lot { id name }',
    );

    expect(rows.map((row) => row.lot?.name ?? null)).toEqual(['LOT-1']);
  });
});
