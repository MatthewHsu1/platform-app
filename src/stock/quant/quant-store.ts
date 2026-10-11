import { quantAvailableQuantity } from 'src/product-expiry/utils/expiry-quantities.util';
import { compareAndSet } from 'src/shared/compare-and-set';
import { includingDeleted } from 'src/shared/triggers/records';
import { DUPLICATE_ENTRY_MESSAGE } from 'src/shared/triggers/retry-on-conflict';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { floatRound } from 'src/shared/utils/float-round.util';
import { lineFilterForKey, parseQuantKey } from 'src/stock/quant/quant-key';
import { MOVE_STATE, OPEN_LINE_STATES } from 'src/stock/stock-options.constant';
import { stockLots } from 'src/stock/lot/lot-records';
import { stockPackages } from 'src/stock/package/package-records';
import { companies, productProducts, stockLocations, stockMoveLines, stockQuants } from 'src/stock/stock-records';
import { nowIso, readStockSettings, todayUtc } from 'src/stock/stock-settings';
import { nextCountDate } from 'src/stock/utils/next-count-date.util';
import { quantName } from 'src/stock/utils/quant-name.util';
import { type QuantSnapshot } from 'src/stock/quant/types/quant-snapshot.type';
import { type QuantStore } from 'src/stock/quant/types/quant-store.type';
import { type ReservationLine } from 'src/stock/quant/types/reservation-line.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

// Twenty drops a relation nested under a to-one relation unless that relation
// also selects deletedAt.
export const QUANT_SNAPSHOT_SELECTION =
  'id quantKey quantity reservedQuantity inDate version inventoryQuantitySet inventoryQuantity inventoryDiffQuantity removalDate product { deletedAt productTmpl { useExpirationDate } }';

type SnapshotRow = Omit<QuantSnapshot, 'useExpirationDate'> & {
  product: { productTmpl: { useExpirationDate: boolean | null } | null } | null;
};

export const toSnapshot = ({ product, ...row }: SnapshotRow): QuantSnapshot => ({
  ...row,
  quantity: row.quantity ?? 0,
  reservedQuantity: row.reservedQuantity ?? 0,
  version: row.version ?? 0,
  inventoryQuantitySet: row.inventoryQuantitySet ?? false,
  removalDate: row.removalDate ?? null,
  useExpirationDate: product?.productTmpl?.useExpirationDate === true,
});

// Compensations count whether or not someone put them in the trash: the stock they moved is not undone by that.
const sumCompensations = async (filter: Record<string, unknown>) => {
  const data = requireData(
    await twentyGraphql<{ stockLotCompensations: { sumQuantity: number | null } }>(
      'application',
      `query CompensationSum($filter: StockLotCompensationFilterInput) { stockLotCompensations(filter: $filter) { sumQuantity } }`,
      { filter: includingDeleted(filter) },
    ),
    'Sum lot compensations',
  );

  return data.stockLotCompensations.sumQuantity ?? 0;
};

const sumDoneQuantity = async (filter: Record<string, unknown>) => {
  const data = requireData(
    await twentyGraphql<{ stockMoveLines: { sumQuantityProductUom: number | null } }>(
      'application',
      `query LedgerSum($filter: StockMoveLineFilterInput) { stockMoveLines(filter: $filter) { sumQuantityProductUom } }`,
      { filter: { ...filter, state: { eq: MOVE_STATE.DONE } } },
    ),
    'Sum done move lines',
  );

  return data.stockMoveLines.sumQuantityProductUom ?? 0;
};

export const graphqlQuantStore: QuantStore = {
  findByKey: async (key) => {
    const [row] = await stockQuants.find<SnapshotRow>({ quantKey: { eq: key } }, QUANT_SNAPSHOT_SELECTION);

    return row === undefined ? null : toSnapshot(row);
  },
  create: async (key, { quantity, reservedQuantity, inDate }) => {
    const parts = parseQuantKey(key);
    const [[product], [location], [owner], [lot], [pack]] = await Promise.all([
      productProducts.find<{ name: string | null; productTmpl: { useExpirationDate: boolean | null } | null }>(
        { id: { eq: parts.productId } },
        'name productTmpl { useExpirationDate }',
      ),
      stockLocations.find<{
        name: string | null;
        completeName: string | null;
        usage: LocationUsage;
        nextInventoryDate: string | null;
      }>({ id: { eq: parts.locationId } }, 'name completeName usage nextInventoryDate'),
      parts.ownerId === null ? [] : companies.find<{ name: string | null }>({ id: { eq: parts.ownerId } }, 'name'),
      parts.lotId === null
        ? []
        : stockLots.find<{ name: string | null; expirationDate: string | null; removalDate: string | null }>(
            { id: { eq: parts.lotId } },
            'name expirationDate removalDate',
          ),
      parts.packageId === null
        ? []
        : stockPackages.find<{ name: string | null; completeName: string | null }>({ id: { eq: parts.packageId } }, 'name completeName'),
    ]);
    const settings = readStockSettings();

    try {
      await stockQuants.createMany([
        {
          quantKey: key,
          name: quantName({
            productName: product?.name ?? '',
            locationName: location?.completeName ?? location?.name ?? '',
            lotName: lot?.name ?? null,
            packageName: pack === undefined ? null : (pack.completeName ?? pack.name),
            ownerName: owner?.name ?? null,
          }),
          productId: parts.productId,
          locationId: parts.locationId,
          ownerId: parts.ownerId,
          ...(parts.lotId === null ? {} : { lotId: parts.lotId }),
          ...(parts.packageId === null ? {} : { packageId: parts.packageId }),
          // A stock row of a lot carries the lot's dates from the start, whichever path makes it.
          ...(lot === undefined ? {} : { expirationDate: lot.expirationDate, removalDate: lot.removalDate }),
          quantity,
          reservedQuantity,
          availableQuantity: floatRound(
            quantAvailableQuantity({
              quantity,
              reservedQuantity,
              removalDate: lot?.removalDate ?? null,
              useExpirationDate: product?.productTmpl?.useExpirationDate === true,
              now: new Date(),
            }),
            10 ** -settings.productUnitDigits,
            'HALF-UP',
          ),
          inDate,
          version: 0,
          inventoryDate:
            location === undefined
              ? null
              : nextCountDate({
                  usage: location.usage,
                  nextInventoryDate: location.nextInventoryDate,
                  today: todayUtc(),
                  annualInventoryMonth: settings.annualInventoryMonth,
                  annualInventoryDay: settings.annualInventoryDay,
                }),
        },
      ]);
    } catch (error) {
      if (error instanceof Error && error.message.includes(DUPLICATE_ENTRY_MESSAGE)) {
        // The unique index counts soft-deleted rows, which findByKey does not
        // see: a deleted stock level is put back (as its delete rule does) so
        // the caller's next read finds it.
        const [existing] = await stockQuants.findIncludingDeleted<{ id: string; deletedAt: string | null }>(
          { quantKey: { eq: key } },
          'id deletedAt',
        );

        if (existing !== undefined && existing.deletedAt !== null) {
          await stockQuants.restore(existing.id);
        }

        return null;
      }
      throw error;
    }

    return graphqlQuantStore.findByKey(key);
  },
  compareAndSet: (id, version, data) =>
    compareAndSet({ objectSingular: 'stockQuant', objectPlural: 'stockQuants', id, version, data }),
  locationUsage: async (locationId) => {
    const [location] = await stockLocations.find<{ usage: LocationUsage }>({ id: { eq: locationId } }, 'usage');

    if (location === undefined) {
      throw new Error(`Location ${locationId} not found.`);
    }

    return location.usage;
  },
  openLines: async (key) =>
    (
      await stockMoveLines.find<Omit<ReservationLine, 'quantityProductUom'> & { quantityProductUom: number | null }>(
        { ...lineFilterForKey(key, 'source'), state: { in: OPEN_LINE_STATES } },
        'id moveId quantity quantityProductUom picked createdAt',
      )
    ).map((line) => ({ ...line, quantityProductUom: line.quantityProductUom ?? 0 })),
  destroyLines: async (ids) => {
    await stockMoveLines.destroyMany(ids);
  },
  shrinkLine: (id, quantity, quantityProductUom) => stockMoveLines.update(id, { quantity, quantityProductUom }),
  ledgerTotal: async (key) =>
    (await sumDoneQuantity(lineFilterForKey(key, 'destination'))) -
    (await sumDoneQuantity(lineFilterForKey(key, 'source'))) +
    (await sumCompensations({ lotKey: { eq: key } })) -
    (await sumCompensations({ noLotKey: { eq: key } })),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: nowIso,
  digits: () => readStockSettings().productUnitDigits,
};
