import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { RECORD_FACTS_MESSAGES } from 'src/stock/facts/record-facts-messages.constant';
import { type PackageContentFacts } from 'src/stock/facts/types/package-content-facts.type';
import { type PackageTransferLine } from 'src/stock/facts/types/package-transfer-line.type';
import { type PickingFacts } from 'src/stock/facts/types/picking-facts.type';
import { type ProductInventoryFacts } from 'src/stock/facts/types/product-inventory-facts.type';
import { type RecordFactsKind } from 'src/stock/facts/types/record-facts-kind.type';
import { type ResultPackageRow } from 'src/stock/facts/types/result-package-row.type';
import { type VariantQuantRow } from 'src/stock/facts/types/variant-quant-row.type';
import { readPackageTreeIds } from 'src/stock/package/read-package-content';
import { walkPackageTree } from 'src/stock/package/walk-package-tree';
import { readOpenLinePackageChain, readReturnIds } from 'src/stock/picking/read-picking-related';
import { pickingWarningText } from 'src/stock/printing/utils/picking-print-data.util';
import { StockUserError } from 'src/stock/stock-errors';
import { MOVE_STATE, PICKING_STATE, PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { findReadableAsPerson } from 'src/stock/stock-person-writes';
import { categoryChain } from 'src/stock/utils/product-routes-report.util';
import {
  duplicatedSerialQuantIds,
  moveLotTotals,
  movesInOut,
  nextSerialOfSequence,
  oneYearBefore,
  packageContentSummary,
  reorderingSummary,
} from 'src/stock/utils/record-facts.util';
import { inInternalWarehouseLocation } from 'src/stock/utils/status-targets.util';
import { type MoveLotTotal } from 'src/stock/utils/types/move-lot-total.type';
import { type PackageContentQuant } from 'src/stock/utils/types/package-content-quant.type';

// Every read runs as the clicking user: a record their row rules hide is not found.

const KINDS: RecordFactsKind[] = [
  'picking',
  'pickingResultPackages',
  'moveLots',
  'productInventory',
  'variantQuants',
  'packageContent',
  'packageTransfers',
];

const readOne = async <TRow>(objectPlural: string, filterType: string, id: string, selection: string) => {
  const [row] = await findReadableAsPerson<TRow>(objectPlural, filterType, { id: { eq: id } }, selection);

  if (row === undefined) {
    throw new StockUserError(RECORD_FACTS_MESSAGES.notFound);
  }
  return row;
};

const readByIds = <TRow>(objectPlural: string, filterType: string, ids: string[], selection: string, filter: Record<string, unknown> = {}) =>
  readInChunks(ids, (part) => findReadableAsPerson<TRow>(objectPlural, filterType, { ...filter, id: { in: part } }, selection));

type Live<TRow> = (TRow & { deletedAt: string | null }) | null;

const live = <TRow>(row: Live<TRow>) => (row === null || row.deletedAt !== null ? null : row);

type WarnContact = { deletedAt: string | null; pickingWarnMsg: string | null };

const pickingFacts = async (pickingId: string): Promise<PickingFacts> => {
  const picking = await readOne<{
    signature: unknown[] | null;
    person: Live<WarnContact & { company: Live<WarnContact> }>;
    company: Live<WarnContact>;
  }>(
    'stockPickings',
    'StockPickingFilterInput',
    pickingId,
    `signature { fileId }
    person { deletedAt pickingWarnMsg company { deletedAt pickingWarnMsg } }
    company { deletedAt pickingWarnMsg }`,
  );
  const moves = await findReadableAsPerson<{ product: Live<{ productTmpl: Live<{ tracking: string | null }> }> }>(
    'stockMoves',
    'StockMoveFilterInput',
    { pickingId: { eq: pickingId } },
    'product { deletedAt productTmpl { deletedAt tracking } }',
  );
  // The transfer's partner is its contact person when set, else its company.
  const person = live(picking.person);
  const contact = person ?? live(picking.company);

  return {
    warningText: pickingWarningText(contact?.pickingWarnMsg ?? null, live(person?.company ?? null)?.pickingWarnMsg ?? null),
    returnCount: (await readReturnIds(pickingId)).length,
    isSigned: (picking.signature ?? []).length > 0,
    hasTracking: moves.some((move) => (live(live(move.product)?.productTmpl ?? null)?.tracking ?? PRODUCT_TRACKING.NONE) !== PRODUCT_TRACKING.NONE),
  };
};

const pickingResultPackages = async (pickingId: string): Promise<{ packages: ResultPackageRow[] }> => {
  const picking = await readOne<{ state: string }>('stockPickings', 'StockPickingFilterInput', pickingId, 'state');

  if (picking.state === PICKING_STATE.DONE) {
    return { packages: [] };
  }
  const chainIds = [...(await readOpenLinePackageChain(pickingId)).keys()];
  const rows = await readByIds<{ id: string; name: string | null; location: Live<{ completeName: string | null }> }>(
    'stockPackages',
    'StockPackageFilterInput',
    chainIds,
    'id name location { deletedAt completeName }',
  );
  const byId = new Map(rows.map((row) => [row.id, row]));

  return {
    packages: chainIds.flatMap((id) => {
      const row = byId.get(id);

      return row === undefined ? [] : [{ id, name: row.name ?? '', location: live(row.location)?.completeName ?? '' }];
    }),
  };
};

const moveLots = async (moveId: string): Promise<{ lots: MoveLotTotal[] }> => {
  await readOne('stockMoves', 'StockMoveFilterInput', moveId, 'id');
  const lines = await findReadableAsPerson<{ lotId: string | null; quantity: number; lot: Live<{ name: string | null }> }>(
    'stockMoveLines',
    'StockMoveLineFilterInput',
    { moveId: { eq: moveId } },
    'lotId quantity lot { deletedAt name }',
  );

  return {
    lots: moveLotTotals(
      lines.map((line) => {
        const lot = live(line.lot);

        return { lotId: lot === null ? null : line.lotId, lotName: lot?.name ?? '', quantity: line.quantity };
      }),
    ),
  };
};

type Variant = { id: string; name: string | null; defaultCode: string | null; createdAt: string };

// Variants in their list order: internal reference (none last), name, then the oldest first.
const byVariantOrder = (left: Variant, right: Variant) => {
  const code = (variant: Variant) => variant.defaultCode ?? '';

  if (code(left) !== code(right)) {
    return code(left) === '' ? 1 : code(right) === '' ? -1 : code(left).localeCompare(code(right));
  }
  return (left.name ?? '').localeCompare(right.name ?? '') || left.createdAt.localeCompare(right.createdAt);
};

// Done lines of the last twelve months, counted per operation type code of their transfer.
const countMovesLastYear = async (variantIds: string[]) => {
  const since = oneYearBefore(new Date().toISOString());
  const groups: { pickingTypeCode: string | null; count: number }[] = [];

  for (let start = 0; start < variantIds.length; start += 200) {
    const data = requireData(
      await twentyGraphql<{ stockMoveLinesGroupBy: { groupByDimensionValues: (string | null)[]; totalCount: number | null }[] }>(
        'person',
        `query MovesLastYear($filter: StockMoveLineFilterInput) {
          stockMoveLinesGroupBy(groupBy: [{ picking: { pickingTypeCode: true } }], filter: $filter, limit: 10) {
            groupByDimensionValues
            totalCount
          }
        }`,
        { filter: { productId: { in: variantIds.slice(start, start + 200) }, state: { eq: MOVE_STATE.DONE }, date: { gte: since } } },
      ),
      'Count moves',
    );
    groups.push(
      ...data.stockMoveLinesGroupBy.map((group) => ({ pickingTypeCode: group.groupByDimensionValues[0] ?? null, count: group.totalCount ?? 0 })),
    );
  }
  return movesInOut(groups);
};

const productInventory = async (templateId: string): Promise<ProductInventoryFacts> => {
  const template = await readOne<{ categId: string | null; lotSequence: Live<{ numberNext: number; padding: number }> }>(
    'productTemplates',
    'ProductTemplateFilterInput',
    templateId,
    'categId lotSequence { deletedAt numberNext padding }',
  );
  const variants = (
    await findReadableAsPerson<Variant>(
      'productProducts',
      'ProductProductFilterInput',
      { productTmplId: { eq: templateId }, active: { eq: true } },
      'id name defaultCode createdAt',
    )
  ).sort(byVariantOrder);
  const variantIds = variants.map((variant) => variant.id);
  const variantName = new Map(variants.map((variant) => [variant.id, variant.name ?? '']));
  const [category] =
    template.categId === null
      ? []
      : await findReadableAsPerson<{ id: string; parentPath: string | null }>(
          'productCategories',
          'ProductCategoryFilterInput',
          { id: { eq: template.categId } },
          'id parentPath',
        );
  const orderpoints = await readInChunks(variantIds, (part) =>
    findReadableAsPerson<{
      id: string;
      name: string | null;
      productId: string;
      productMinQty: number | null;
      productMaxQty: number | null;
      location: Live<{ completeName: string | null }>;
    }>(
      'stockWarehouseOrderpoints',
      'StockWarehouseOrderpointFilterInput',
      { productId: { in: part }, active: { eq: true } },
      'id name productId productMinQty productMaxQty location { deletedAt completeName }',
    ),
  );
  const putawayRules = await findReadableAsPerson<{
    id: string;
    name: string | null;
    locationIn: Live<{ completeName: string | null }>;
    locationOut: Live<{ completeName: string | null }>;
  }>(
    'stockPutawayRules',
    'StockPutawayRuleFilterInput',
    {
      active: { eq: true },
      or: [{ productId: { in: variantIds } }, { categoryId: { in: category === undefined ? [] : categoryChain(category.id, category.parentPath) } }],
    },
    'id name locationIn { deletedAt completeName } locationOut { deletedAt completeName }',
  );
  const storageCapacities = await readInChunks(variantIds, (part) =>
    findReadableAsPerson<{ id: string; name: string | null; quantity: number | null; storageCategory: Live<{ name: string | null }> }>(
      'stockStorageCategoryCapacities',
      'StockStorageCategoryCapacityFilterInput',
      { productId: { in: part } },
      'id name quantity storageCategory { deletedAt name }',
    ),
  );
  const groups = variants.flatMap((variant) => {
    const own = orderpoints.filter((row) => row.productId === variant.id);

    return own.length === 0
      ? []
      : [
          {
            productId: variant.id,
            count: own.length,
            minSum: own.reduce((total, row) => total + (row.productMinQty ?? 0), 0),
            maxSum: own.reduce((total, row) => total + (row.productMaxQty ?? 0), 0),
          },
        ];
  });

  return {
    nextSerial: nextSerialOfSequence(live(template.lotSequence)),
    ...(await countMovesLastYear(variantIds)),
    ...reorderingSummary(groups, true),
    orderpoints: orderpoints.map((row) => ({
      id: row.id,
      name: row.name ?? '',
      variant: variantName.get(row.productId) ?? '',
      location: live(row.location)?.completeName ?? '',
      productMinQty: row.productMinQty ?? 0,
      productMaxQty: row.productMaxQty ?? 0,
    })),
    putawayRules: putawayRules.map((row) => ({
      id: row.id,
      name: row.name ?? '',
      locationIn: live(row.locationIn)?.completeName ?? '',
      locationOut: live(row.locationOut)?.completeName ?? '',
    })),
    storageCapacities: storageCapacities.map((row) => ({
      id: row.id,
      name: row.name ?? '',
      storageCategory: live(row.storageCategory)?.name ?? '',
      quantity: row.quantity ?? 0,
    })),
  };
};

type QuantLocation = Live<{ usage: string; warehouseId: string | null; completeName: string | null }>;

// The variant's stock in warehouse locations, each row marked when its serial
// number is in stock somewhere else too.
const variantQuants = async (productId: string): Promise<{ quants: VariantQuantRow[] }> => {
  const variant = await readOne<{ productTmpl: Live<{ tracking: string | null }> }>(
    'productProducts',
    'ProductProductFilterInput',
    productId,
    'productTmpl { deletedAt tracking }',
  );
  const tracking = live(variant.productTmpl)?.tracking ?? PRODUCT_TRACKING.NONE;
  const quants = (
    await findReadableAsPerson<{ id: string; quantity: number; lotId: string | null; lot: Live<{ name: string | null }>; location: QuantLocation }>(
      'stockQuants',
      'StockQuantFilterInput',
      { productId: { eq: productId } },
      'id quantity lotId lot { deletedAt name } location { deletedAt usage warehouseId completeName }',
    )
  ).filter((quant) => inInternalWarehouseLocation(live(quant.location)));
  const lotIds = [...new Set(quants.flatMap((quant) => (quant.lotId === null ? [] : [quant.lotId])))];
  const sameLots = await readInChunks(lotIds, (part) =>
    findReadableAsPerson<{ id: string; quantity: number; lotId: string | null; location: Live<{ usage: string }> }>(
      'stockQuants',
      'StockQuantFilterInput',
      { lotId: { in: part } },
      'id quantity lotId location { deletedAt usage }',
    ),
  );
  const duplicated = duplicatedSerialQuantIds(
    sameLots.map((quant) => ({
      id: quant.id,
      lotId: quant.lotId,
      tracking,
      quantity: quant.quantity,
      locationUsage: live(quant.location)?.usage ?? '',
    })),
  );

  return {
    quants: quants.map((quant) => ({
      id: quant.id,
      location: live(quant.location)?.completeName ?? '',
      lot: live(quant.lot)?.name ?? '',
      quantity: quant.quantity,
      snDuplicated: duplicated.has(quant.id),
    })),
  };
};

type ContentQuant = {
  packageId: string;
  quantity: number;
  ownerId: string | null;
  owner: Live<{ name: string | null }>;
  product: Live<{ id: string; name: string | null; weight: number | null; productTmpl: Live<{ uom: Live<{ name: string | null }> }> }>;
};

const packageContent = async (packageId: string): Promise<PackageContentFacts> => {
  await readOne('stockPackages', 'StockPackageFilterInput', packageId, 'id');
  const treeIds = await readPackageTreeIds(packageId);
  const packages = await readByIds<{ id: string; packageType: Live<{ baseWeight: number | null }> }>(
    'stockPackages',
    'StockPackageFilterInput',
    treeIds,
    'id packageType { deletedAt baseWeight }',
  );
  // Rows with stock or a reservation are what a package holds.
  const quants = await readInChunks(treeIds, (part) =>
    findReadableAsPerson<ContentQuant>(
      'stockQuants',
      'StockQuantFilterInput',
      { packageId: { in: part }, or: [{ quantity: { neq: 0 } }, { reservedQuantity: { neq: 0 } }] },
      `packageId quantity ownerId owner { deletedAt name }
      product { deletedAt id name weight productTmpl { deletedAt uom { deletedAt name } } }`,
    ),
  );
  const toContentQuant = (quant: ContentQuant): PackageContentQuant => {
    const product = live(quant.product);

    return {
      productId: product?.id ?? '',
      productName: product?.name ?? '',
      uomName: live(live(product?.productTmpl ?? null)?.uom ?? null)?.name ?? '',
      quantity: quant.quantity,
      productWeight: product?.weight ?? 0,
      ownerId: quant.ownerId,
    };
  };
  const baseWeightOf = (id: string) => live(packages.find((pack) => pack.id === id)?.packageType ?? null)?.baseWeight ?? 0;
  const direct = quants.filter((quant) => quant.packageId === packageId);
  const summary = packageContentSummary({
    locale: await readUserLocale(),
    baseWeight: baseWeightOf(packageId),
    childBaseWeights: treeIds.filter((id) => id !== packageId).map(baseWeightOf),
    directQuants: direct.map(toContentQuant),
    childQuants: quants.filter((quant) => quant.packageId !== packageId).map(toContentQuant),
  });

  return {
    ...summary,
    ownerName: summary.ownerId === null ? '' : (live(direct.find((quant) => quant.ownerId === summary.ownerId)?.owner ?? null)?.name ?? ''),
  };
};

// The lines not yet done that put things in the package or in a package headed into it.
const packageTransfers = async (packageId: string): Promise<{ lines: PackageTransferLine[] }> => {
  await readOne('stockPackages', 'StockPackageFilterInput', packageId, 'id');
  const headedIn = await walkPackageTree<{ id: string; packageDestId: string | null }>({
    startIds: [packageId],
    up: [],
    down: ['packageDestId'],
    selection: 'id packageDestId',
  });
  const lines = await readInChunks([...headedIn.keys()], (part) =>
    findReadableAsPerson<{
      id: string;
      quantity: number;
      product: Live<{ name: string | null }>;
      picking: Live<{ name: string | null; state: string }>;
      resultPackage: Live<{ name: string | null }>;
    }>(
      'stockMoveLines',
      'StockMoveLineFilterInput',
      { resultPackageId: { in: part }, not: { state: { in: [MOVE_STATE.DONE, MOVE_STATE.CANCEL] } } },
      'id quantity product { deletedAt name } picking { deletedAt name state } resultPackage { deletedAt name }',
    ),
  );

  return {
    lines: lines.map((line) => ({
      id: line.id,
      transfer: live(line.picking)?.name ?? '',
      transferState: live(line.picking)?.state ?? '',
      product: live(line.product)?.name ?? '',
      quantity: line.quantity,
      package: live(line.resultPackage)?.name ?? '',
    })),
  };
};

const READERS: Record<RecordFactsKind, (recordId: string) => Promise<unknown>> = {
  picking: pickingFacts,
  pickingResultPackages,
  moveLots,
  productInventory,
  variantQuants,
  packageContent,
  packageTransfers,
};

const isKind = (value: unknown): value is RecordFactsKind => KINDS.some((kind) => kind === value);

export const readRecordFacts = async (body: Record<string, unknown>) => {
  const { kind, recordId } = body;

  if (!isKind(kind) || typeof recordId !== 'string' || recordId.length === 0) {
    throw new StockUserError(RECORD_FACTS_MESSAGES.invalidRequest);
  }
  return { facts: await READERS[kind](recordId) };
};
