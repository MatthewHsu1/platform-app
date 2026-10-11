import { compareAndSet } from 'src/shared/compare-and-set';
import { translate } from 'src/shared/i18n/translate';
import { addNote } from 'src/shared/triggers/put-back';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { stockLotCompensations, stockLots } from 'src/stock/lot/lot-records';
import { stockPackages } from 'src/stock/package/package-records';
import { quantKey } from 'src/stock/quant/quant-key';
import { graphqlQuantStore } from 'src/stock/quant/quant-store';
import { makeReadLedgerGroups } from 'src/stock/scheduler/read-ledger-groups';
import { type LedgerDimension } from 'src/stock/scheduler/types/ledger-dimension.type';
import { type LedgerGroupQuery } from 'src/stock/scheduler/types/ledger-group-query.type';
import { type LedgerStore } from 'src/stock/scheduler/types/ledger-store.type';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { productProducts, productTemplates, stockQuants } from 'src/stock/stock-records';
import { nowIso, readStockSettings } from 'src/stock/stock-settings';
import { type LedgerQuant } from 'src/stock/utils/types/ledger-quant.type';

// Twenty answers 50 groups when no limit is given.
const GROUP_LIMIT = 1000;
// Stock comes into the result package of a line and leaves its source package.
const DIMENSION_FIELDS: Record<'in' | 'out', Record<LedgerDimension, { relation: string; field: string }>> = {
  in: {
    product: { relation: 'product', field: 'productId' },
    location: { relation: 'locationDest', field: 'locationDestId' },
    owner: { relation: 'owner', field: 'ownerId' },
    lot: { relation: 'lot', field: 'lotId' },
    package: { relation: 'resultPackage', field: 'resultPackageId' },
  },
  out: {
    product: { relation: 'product', field: 'productId' },
    location: { relation: 'location', field: 'locationId' },
    owner: { relation: 'owner', field: 'ownerId' },
    lot: { relation: 'lot', field: 'lotId' },
    package: { relation: 'package', field: 'packageId' },
  },
};

type LedgerGroup = { groupByDimensionValues: (string | null)[]; sumQuantityProductUom: number | null };

const valuesFilter = (field: string, values: (string | null)[], exclude = false) => {
  if (exclude) {
    const ids = values.filter((value): value is string => value !== null);

    return ids.length === 0
      ? { [field]: { is: 'NOT_NULL' } }
      : { and: [{ [field]: { is: 'NOT_NULL' } }, { not: { [field]: { in: ids } } }] };
  }
  const ids = values.filter((value): value is string => value !== null);
  const parts = [
    ...(ids.length > 0 ? [{ [field]: { in: ids } }] : []),
    ...(values.includes(null) ? [{ [field]: { is: 'NULL' } }] : []),
  ];

  return parts.length === 1 ? parts[0] : { or: parts };
};

const doneSums: LedgerGroupQuery = async ({ side, conditions, dimensions, limit }) => {
  const fields = DIMENSION_FIELDS[side];
  const data = requireData(
    await twentyGraphql<{ stockMoveLinesGroupBy: LedgerGroup[] }>(
      'application',
      `query LedgerSums($groupBy: [StockMoveLineGroupByInput!]!, $filter: StockMoveLineFilterInput, $limit: Int) {
        stockMoveLinesGroupBy(groupBy: $groupBy, filter: $filter, limit: $limit) {
          groupByDimensionValues
          sumQuantityProductUom
        }
      }`,
      {
        groupBy: dimensions.map((dimension) => ({ [fields[dimension].relation]: { id: true } })),
        filter: {
          and: [
            { state: { eq: MOVE_STATE.DONE } },
            ...conditions.map((condition) => valuesFilter(fields[condition.dimension].field, condition.values, condition.exclude)),
          ],
        },
        limit,
      },
    ),
    `Sum done move lines ${side}`,
  );

  return data.stockMoveLinesGroupBy.map((group) => ({ values: group.groupByDimensionValues, sum: group.sumQuantityProductUom ?? 0 }));
};

// Trashed lots too: their done lines still count.
const readLotIds = async (productId: string) =>
  (await stockLots.findIncludingDeleted<{ id: string }>({ productId: { eq: productId } }, 'id')).map((lot) => lot.id);

// Every package, trashed ones too: their done lines still count.
const readPackageIds = async () => (await stockPackages.findIncludingDeleted<{ id: string }>({}, 'id')).map((row) => row.id);

const readLedgerGroups = makeReadLedgerGroups(doneSums, GROUP_LIMIT, readLotIds, readPackageIds);

type QuantReadRow = Omit<LedgerQuant, 'quantKey' | 'quantity' | 'reservedQuantity' | 'version' | 'useExpirationDate'> & {
  productId: string;
  product: { productTmpl: { useExpirationDate: boolean | null } | null } | null;
  quantKey: string | null;
  quantity: number | null;
  reservedQuantity: number | null;
  version: number | null;
};

// Twenty drops a relation nested under a to-one relation unless that relation
// also selects deletedAt.
const LEDGER_QUANT_SELECTION =
  'id productId quantKey quantity reservedQuantity version inventoryQuantitySet inventoryQuantity inventoryDiffQuantity removalDate product { deletedAt productTmpl { useExpirationDate } }';

const toLedgerQuant = ({ product, ...row }: QuantReadRow): (LedgerQuant & { productId: string })[] =>
  row.quantKey === null
    ? []
    : [
        {
          ...row,
          useExpirationDate: product?.productTmpl?.useExpirationDate === true,
          removalDate: row.removalDate ?? null,
          quantKey: row.quantKey,
          quantity: row.quantity ?? 0,
          reservedQuantity: row.reservedQuantity ?? 0,
          version: row.version ?? 0,
        },
      ];

export const readStorableProductIds = async () => {
  const templates = await productTemplates.find<{ id: string }>({ isStorable: { eq: true } }, 'id');

  if (templates.length === 0) {
    return [];
  }
  const variants = await productProducts.find<{ id: string }>(
    { productTmplId: { in: templates.map((template) => template.id) } },
    'id',
  );

  return variants.map((variant) => variant.id);
};

export const graphqlLedgerStore: LedgerStore = {
  storableProductIds: readStorableProductIds,

  ledgerTotals: async (productIds) => {
    const totals = new Map<string, number>();
    const add = (key: string, quantity: number) => totals.set(key, (totals.get(key) ?? 0) + quantity);
    const addGroups = (groups: { values: (string | null)[]; sum: number }[], sign: 1 | -1) => {
      for (const { values: [productId, locationId, ownerId, lotId, packageId], sum } of groups) {
        if (productId === null || locationId === null) {
          continue;
        }
        add(
          quantKey({ productId, locationId, lotId: lotId ?? null, packageId: packageId ?? null, ownerId: ownerId ?? null }),
          sign * sum,
        );
      }
    };

    addGroups(await readLedgerGroups(productIds, 'in'), 1);
    addGroups(await readLedgerGroups(productIds, 'out'), -1);
    // Compensations count whether or not someone put them in the trash: the stock they moved is not undone by that.
    for (const row of await stockLotCompensations.findIncludingDeleted<{ lotKey: string; noLotKey: string; quantity: number }>(
      { productId: { in: productIds } },
      'lotKey noLotKey quantity',
    )) {
      add(row.lotKey, row.quantity);
      add(row.noLotKey, -row.quantity);
    }

    return totals;
  },

  quants: async (productIds) =>
    (await stockQuants.find<QuantReadRow>({ productId: { in: productIds } }, LEDGER_QUANT_SELECTION)).flatMap(toLedgerQuant),

  restoreQuant: async (key) => {
    const [trashed] = await stockQuants.findIncludingDeleted<{ id: string }>(
      { quantKey: { eq: key }, deletedAt: { is: 'NOT_NULL' } },
      'id',
    );

    if (trashed === undefined) {
      return null;
    }
    await stockQuants.restore(trashed.id);
    const [restored] = await stockQuants.find<QuantReadRow>({ id: { eq: trashed.id } }, LEDGER_QUANT_SELECTION);

    return restored === undefined ? null : (toLedgerQuant(restored)[0] ?? null);
  },

  compareAndSet: (id, version, data) =>
    compareAndSet({ objectSingular: 'stockQuant', objectPlural: 'stockQuants', id, version, data }),

  // The quant engine's create names the row like every other stock row.
  createQuant: async (key, quantity) =>
    (await graphqlQuantStore.create(key, { quantity, reservedQuantity: 0, inDate: nowIso() }))?.id ?? null,

  addNote: (quantId, body) =>
    addNote({ objectSingular: 'stockQuant', recordId: quantId, title: translate(null, 'Stock level corrected'), body }),

  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  now: nowIso,

  digits: () => readStockSettings().productUnitDigits,
};
