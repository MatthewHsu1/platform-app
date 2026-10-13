import { makeFakeClaimStore } from 'src/shared/claims/__tests__/fakes/fake-claim-store';

type Row = Record<string, unknown> & { id: string };
type Condition = Record<string, unknown>;

export const claims = makeFakeClaimStore();

// Rows by table. A crash can be armed for the next write that matches.
export const db = {
  tables: new Map<string, Map<string, Row>>(),
  crashOn: null as ((table: string, id: string, data: Record<string, unknown>) => boolean) | null,
  reset() {
    this.tables.clear();
    this.crashOn = null;
    claims.rows.clear();
  },
  seed(table: string, rows: Row[]) {
    this.tables.set(table, new Map(rows.map((row) => [row.id, structuredClone(row)])));
  },
  rows(table: string) {
    return [...(this.tables.get(table)?.values() ?? [])];
  },
};

const matches = (row: Row, filter: Condition): boolean =>
  Object.entries(filter).every(([key, condition]) => {
    if (key === 'and') {
      return (condition as Condition[]).every((part) => matches(row, part));
    }
    if (key === 'or') {
      return (condition as Condition[]).some((part) => matches(row, part));
    }
    const value = row[key];

    return Object.entries(condition as Condition).every(([operator, argument]) => {
      if (operator === 'in') return (argument as unknown[]).includes(value);
      if (operator === 'eq') return value === argument;
      if (operator === 'neq') return value !== argument;
      if (operator === 'is') return argument === 'NULL' ? value == null : value != null;
      if (operator === 'like' && typeof argument === 'string' && argument.endsWith('%') && !argument.slice(0, -1).includes('%')) {
        return typeof value === 'string' && value.startsWith(argument.slice(0, -1));
      }
      throw new Error(`The fake records do not know the filter ${operator}.`);
    });
  });

const fakeRecords = (objectSingular: string, objectPlural: string) => {
  const table = () => {
    if (!db.tables.has(objectPlural)) {
      db.tables.set(objectPlural, new Map());
    }
    return db.tables.get(objectPlural) as Map<string, Row>;
  };
  let counter = 0;

  const update = async (id: string, data: Record<string, unknown>) => {
    if (db.crashOn?.(objectPlural, id, data) === true) {
      db.crashOn = null;
      throw new Error('crash');
    }
    const row = table().get(id);
    if (row !== undefined) {
      table().set(id, { ...row, ...structuredClone(data) });
    }
  };

  return {
    objectSingular,
    objectPlural,
    find: async (filter: Condition) => [...table().values()].filter((row) => matches(row, filter)).map((row) => structuredClone(row)),
    update,
    updateMany: async (ids: string[], data: Record<string, unknown>) => {
      for (const id of new Set(ids)) {
        await update(id, data);
      }
    },
    createMany: async (data: Record<string, unknown>[]) =>
      data.map((values) => {
        counter += 1;
        const id = `${objectSingular}-new-${counter}`;
        table().set(id, { ...structuredClone(values), id });
        return id;
      }),
    destroyMany: async (ids: string[]) => {
      for (const id of ids) {
        table().delete(id);
      }
      return ids;
    },
  };
};

export const fakeStockRecords = {
  stockLocations: fakeRecords('stockLocation', 'stockLocations'),
  stockPickingTypes: fakeRecords('stockPickingType', 'stockPickingTypes'),
  stockPickings: fakeRecords('stockPicking', 'stockPickings'),
  stockMoves: fakeRecords('stockMove', 'stockMoves'),
  stockMoveLines: fakeRecords('stockMoveLine', 'stockMoveLines'),
  stockReferenceMoveRels: fakeRecords('stockReferenceMoveRel', 'stockReferenceMoveRels'),
  stockMoveMoveRels: fakeRecords('stockMoveMoveRel', 'stockMoveMoveRels'),
  stockQuants: fakeRecords('stockQuant', 'stockQuants'),
};
