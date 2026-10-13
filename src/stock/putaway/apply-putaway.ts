import { findMany } from 'src/shared/triggers/records';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { resolveTree } from 'src/shared/utils/resolve-tree.util';
import { stockPackages } from 'src/stock/package/package-records';
import { planPutawayInOrder } from 'src/stock/putaway/plan-putaway';
import {
  productCategories,
  productProducts,
  productTemplates,
  stockLocations,
  stockMoveLines,
  stockPackageTypeStockPutawayRuleRels,
  stockPutawayRules,
  stockQuants,
  stockStorageCategories,
  stockStorageCategoryCapacities,
  uomUoms,
} from 'src/stock/routing-records';
import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { type AllowNewProduct } from 'src/stock/putaway/types/allow-new-product.type';
import { type PutawayInput } from 'src/stock/putaway/types/putaway-input.type';
import { type PutawayLocation } from 'src/stock/putaway/types/putaway-location.type';
import { type PutawayRequest } from 'src/stock/putaway/types/putaway-request.type';
import { type PutawayRule } from 'src/stock/putaway/types/putaway-rule.type';
import { type PutawaySublocation } from 'src/stock/putaway/types/putaway-sublocation.type';
import { type StorageCategory } from 'src/stock/putaway/types/storage-category.type';

type LocationRow = {
  id: string;
  name: string | null;
  completeName: string | null;
  parentPath: string | null;
  usage: string;
  active: boolean | null;
  storageCategoryId: string | null;
};

type RuleRow = {
  id: string;
  productId: string | null;
  categoryId: string | null;
  locationInId: string;
  locationOutId: string;
  storageCategoryId: string | null;
  sublocation: PutawaySublocation | null;
  sequence: number | null;
  createdAt: string;
};

type LineRow = {
  id: string;
  productId: string;
  locationId: string;
  locationDestId: string;
  quantity: number | null;
  quantityProductUom: number | null;
  state: string;
  resultPackageId: string | null;
  resultPackage: { packageTypeId: string | null } | null;
};

const LINE_SELECTION = 'id productId locationId locationDestId quantity quantityProductUom state resultPackageId resultPackage { packageTypeId }';
const OPEN_STATES_FILTER = { not: { state: { in: [MOVE_STATE.DONE, MOVE_STATE.CANCEL] } } };

const compareNullsLast = (left: string | null, right: string | null) =>
  left === right ? 0 : left === null ? 1 : right === null ? -1 : left.localeCompare(right);

// Putaway rules apply by priority, then product.
const byRuleOrder = (left: RuleRow, right: RuleRow) =>
  (left.sequence ?? 0) - (right.sequence ?? 0) ||
  compareNullsLast(left.productId, right.productId) ||
  left.createdAt.localeCompare(right.createdAt) ||
  left.id.localeCompare(right.id);

const toLocation = (row: LocationRow): PutawayLocation => ({
  id: row.id,
  completeName: row.completeName ?? row.name ?? '',
  parentPath: row.parentPath ?? `${row.id}/`,
  usage: row.usage,
  active: row.active !== false,
  storageCategoryId: row.storageCategoryId,
});

const readPackageIdsOfTypes = async (packageTypeIds: string[]) =>
  (await stockPackages.find<{ id: string }>({ packageTypeId: { in: packageTypeIds } }, 'id')).map((row) => row.id);

// Where the latest done line of the product under the location went, or null. A rule for package types looks only
// at lines that put the product into one of `typedPackageIds` (null: any line).
const readLastUsedLocation = async (productId: string, locationIds: string[], typedPackageIds: string[] | null) => {
  if (locationIds.length === 0) {
    return null;
  }
  if (typedPackageIds !== null && typedPackageIds.length === 0) {
    return null;
  }
  const found = requireData(
    await twentyGraphql<{ stockMoveLines: { edges: { node: { locationDestId: string } }[] } }>(
      'application',
      `query LastUsedLocation($filter: StockMoveLineFilterInput) {
        stockMoveLines(filter: $filter, orderBy: [{ date: DescNullsLast }], first: 1) { edges { node { locationDestId } } }
      }`,
      {
        filter: {
          and: [
            { productId: { eq: productId } },
            { state: { eq: MOVE_STATE.DONE } },
            { locationDestId: { in: locationIds } },
            ...(typedPackageIds === null ? [] : [{ resultPackageId: { in: typedPackageIds } }]),
          ],
        },
      },
    ),
    'Last used location',
  );

  return found.stockMoveLines.edges[0]?.node.locationDestId ?? null;
};

// Where each request's product is stored, keyed by the request's key. The
// requests are placed in their order, each one counting the ones before it.
// Reads only the locations a product could go to: the destinations and the
// rules' store-to locations, with everything below them.
export const putawayDestinations = async (requests: PutawayRequest[]): Promise<Map<string, string>> => {
  if (requests.length === 0) {
    return new Map();
  }
  const destinationIds = [...new Set(requests.map((request) => request.locationDestId))];
  const requestPackageIds = [...new Set(requests.flatMap((request) => request.packageId ?? []))];
  const { locationRows, ruleRows, units, packageRows, packageLines } = await findMany<{
    locationRows: LocationRow[];
    ruleRows: RuleRow[];
    units: { id: string; packageTypeId: string | null }[];
    packageRows: { id: string; packageTypeId: string | null }[];
    packageLines: LineRow[];
  }>({
    locationRows: { of: stockLocations, filter: {}, selection: 'id name completeName parentPath usage active storageCategoryId' },
    ruleRows: {
      of: stockPutawayRules,
      filter: { and: [{ locationInId: { in: destinationIds } }, { active: { eq: true } }] },
      selection: 'id productId categoryId locationInId locationOutId storageCategoryId sublocation sequence createdAt',
    },
    units: { of: uomUoms, filter: { id: { in: requests.flatMap((request) => request.packagingUomId ?? []) } }, selection: 'id packageTypeId' },
    packageRows: { of: stockPackages, filter: { id: { in: requestPackageIds } }, selection: 'id packageTypeId' },
    packageLines: {
      of: stockMoveLines,
      filter: { and: [OPEN_STATES_FILTER, { resultPackageId: { in: requestPackageIds } }] },
      selection: LINE_SELECTION,
    },
  });
  const packageById = new Map(packageRows.map((row) => [row.id, row]));
  // A package brings every product its open lines put into it.
  const productIdsOf = (request: PutawayRequest) => [
    ...new Set([
      request.productId,
      ...(request.productIds ?? []),
      ...packageLines.filter((line) => request.packageId !== null && line.resultPackageId === request.packageId).map((line) => line.productId),
    ]),
  ];
  const productIds = [...new Set(requests.flatMap(productIdsOf))];
  const variants = await productProducts.find<{ id: string; productTmplId: string; weight: number | null }>(
    { id: { in: productIds } },
    'id productTmplId weight',
  );
  const locations = new Map(locationRows.map((row) => [row.id, toLocation(row)]));
  const rules = [...ruleRows].sort(byRuleOrder);
  const below = (locationId: string) => {
    const root = locations.get(locationId);
    return root === undefined ? [] : [...locations.values()].filter((location) => location.parentPath.startsWith(root.parentPath));
  };
  const area = [...new Set([...destinationIds, ...rules.map((rule) => rule.locationOutId)])].flatMap(below);
  // Stock, open lines, weights and capacities are only read for locations with a storage category.
  const categoryLocations = rules.length === 0 ? [] : area.filter((location) => location.storageCategoryId !== null);
  const categoryLocationIds = [...new Set(categoryLocations.map((location) => location.id))];
  const storageCategoryIds = [...new Set(categoryLocations.flatMap((location) => location.storageCategoryId ?? []))];
  const templateIds = [...new Set(variants.map((variant) => variant.productTmplId))];

  const { categoryRows, capacityRows, quantRows, lineRows, templates, categoryTree, packageTypeLinks } = await findMany<{
    categoryRows: { id: string; maxWeight: number | null; allowNewProduct: AllowNewProduct | null }[];
    capacityRows: { storageCategoryId: string; productId: string | null; packageTypeId: string | null; quantity: number | null }[];
    quantRows: {
      productId: string;
      locationId: string;
      quantity: number | null;
      packageId: string | null;
      package: { packageTypeId: string | null } | null;
    }[];
    lineRows: LineRow[];
    templates: { id: string; categId: string | null }[];
    categoryTree: { id: string; parentId: string | null }[];
    packageTypeLinks: { stockPutawayRuleId: string; stockPackageTypeId: string }[];
  }>({
    categoryRows: { of: stockStorageCategories, filter: { id: { in: storageCategoryIds } }, selection: 'id maxWeight allowNewProduct' },
    capacityRows: {
      of: stockStorageCategoryCapacities,
      filter: { storageCategoryId: { in: storageCategoryIds } },
      selection: 'storageCategoryId productId packageTypeId quantity',
    },
    quantRows: {
      of: stockQuants,
      filter: { locationId: { in: categoryLocationIds } },
      selection: 'productId locationId quantity packageId package { packageTypeId }',
    },
    lineRows: {
      of: stockMoveLines,
      filter: {
        and: [OPEN_STATES_FILTER, { or: [{ locationDestId: { in: categoryLocationIds } }, { locationId: { in: categoryLocationIds } }] }],
      },
      selection: LINE_SELECTION,
    },
    templates: { of: productTemplates, filter: { id: { in: rules.length > 0 ? templateIds : [] } }, selection: 'id categId' },
    categoryTree: { of: productCategories, filter: rules.some((rule) => rule.categoryId !== null) ? {} : { id: { in: [] } }, selection: 'id parentId' },
    packageTypeLinks: {
      of: stockPackageTypeStockPutawayRuleRels,
      filter: { stockPutawayRuleId: { in: rules.map((rule) => rule.id) } },
      selection: 'stockPutawayRuleId stockPackageTypeId',
    },
  });
  const knownWeights = new Set(variants.map((variant) => variant.id));
  // The package's own lines count wherever they go, so its weight is known.
  const openLineRows = [...new Map([...lineRows, ...packageLines].map((line) => [line.id, line])).values()];
  const otherProductIds = [...new Set([...quantRows, ...openLineRows].map((row) => row.productId))].filter((id) => !knownWeights.has(id));
  const otherVariants = await productProducts.find<{ id: string; weight: number | null }>({ id: { in: otherProductIds } }, 'id weight');
  const productWeights = new Map([...variants, ...otherVariants].map((variant) => [variant.id, variant.weight ?? 0]));

  const { chains } = resolveTree(categoryTree);
  const categoryOf = (productId: string) => {
    const templateId = variants.find((variant) => variant.id === productId)?.productTmplId;
    return templates.find((template) => template.id === templateId)?.categId ?? null;
  };
  // Products put away together share a category chain only when they share one category.
  const categoryChainOf = (productIds: string[]) => {
    const categoryIds = new Set(productIds.map(categoryOf));
    const [categoryId] = [...categoryIds];
    return categoryIds.size !== 1 || categoryId === null || categoryId === undefined
      ? []
      : (chains.get(categoryId) ?? []).map((link) => link.id).reverse();
  };
  const storageCategories = new Map<string, StorageCategory>(
    categoryRows.map((category) => {
      const capacities = capacityRows.filter((row) => row.storageCategoryId === category.id);
      return [
        category.id,
        {
          id: category.id,
          maxWeight: category.maxWeight ?? 0,
          allowNewProduct: category.allowNewProduct ?? 'MIXED',
          productCapacities: new Map(capacities.flatMap((row) => (row.productId === null ? [] : [[row.productId, row.quantity ?? 0] as const]))),
          packageTypeCapacities: new Map(capacities.flatMap((row) => (row.packageTypeId === null ? [] : [[row.packageTypeId, row.quantity ?? 0] as const]))),
        },
      ];
    }),
  );
  const putawayRules: (PutawayRule & { locationInId: string })[] = rules.map((rule) => ({
    id: rule.id,
    productId: rule.productId,
    categoryId: rule.categoryId,
    packageTypeIds: packageTypeLinks.filter((link) => link.stockPutawayRuleId === rule.id).map((link) => link.stockPackageTypeId),
    locationInId: rule.locationInId,
    locationOutId: rule.locationOutId,
    storageCategoryId: rule.storageCategoryId,
    sublocation: rule.sublocation ?? 'NO',
  }));
  const quants = quantRows.map((quant) => ({
    productId: quant.productId,
    locationId: quant.locationId,
    quantity: quant.quantity ?? 0,
    packageId: quant.packageId,
    packageTypeId: quant.package?.packageTypeId ?? null,
  }));
  const openLines = openLineRows.map((line) => ({
    id: line.id,
    productId: line.productId,
    locationId: line.locationId,
    locationDestId: line.locationDestId,
    quantityProductUom: line.quantityProductUom ?? line.quantity ?? 0,
    resultPackageId: line.resultPackageId,
    resultPackageTypeId: line.resultPackage?.packageTypeId ?? null,
    isDraft: line.state === MOVE_STATE.DRAFT,
  }));

  const lastUsed = new Map<string, string | null>();
  // The packages of a rule's types, read once per rule in this run.
  const typedPackages = new Map<string, string[]>();
  const typedPackagesOf = async (rule: PutawayRule) => {
    if (rule.packageTypeIds.length === 0) {
      return null;
    }
    if (!typedPackages.has(rule.id)) {
      typedPackages.set(rule.id, await readPackageIdsOfTypes(rule.packageTypeIds));
    }
    return typedPackages.get(rule.id) ?? [];
  };
  const lastUsedFor = async (rule: PutawayRule, productId: string) => {
    const cacheKey = `${rule.id}:${productId}`;
    if (!lastUsed.has(cacheKey)) {
      lastUsed.set(
        cacheKey,
        await readLastUsedLocation(productId, below(rule.locationOutId).map((location) => location.id), await typedPackagesOf(rule)),
      );
    }
    return lastUsed.get(cacheKey) ?? null;
  };

  const entries: { key: string; input: PutawayInput; arrivingQuantity?: number }[] = [];

  for (const request of requests) {
    const requestPackage = request.packageId === null ? undefined : packageById.get(request.packageId);
    const destinationRules = putawayRules.filter((rule) => rule.locationInId === request.locationDestId);
    const lastUsedLocationIds = new Map<string, string | null>();

    for (const rule of destinationRules) {
      if (rule.sublocation === 'LAST_USED') {
        lastUsedLocationIds.set(rule.id, await lastUsedFor(rule, request.productId));
      }
    }
    entries.push({
      key: request.key,
      arrivingQuantity: request.arrivingQuantity,
      input: {
        destinationId: request.locationDestId,
        productId: request.productId,
        productIds: productIdsOf(request),
        categoryChain: categoryChainOf(productIdsOf(request)),
        quantity: request.quantity,
        package: requestPackage === undefined ? null : { id: requestPackage.id, packageTypeId: requestPackage.packageTypeId },
        packagingPackageTypeId: units.find((unit) => unit.id === request.packagingUomId)?.packageTypeId ?? null,
        extraQuantities: new Map(),
        candidateLocationIds: null,
        rules: destinationRules,
        locations,
        storageCategories,
        quants,
        openLines,
        excludedLineIds: new Set(request.excludedLineIds ?? []),
        productWeights,
        lastUsedLocationIds,
      },
    });
  }

  return planPutawayInOrder(entries);
};
