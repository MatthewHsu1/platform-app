import { readInChunks } from 'src/shared/utils/read-in-chunks.util';
import { readText } from 'src/shared/utils/read-text.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { PRODUCT_ROUTES_MESSAGES } from 'src/stock/reports/product-routes/product-routes-messages.constant';
import { type ProductRoutesAnswer } from 'src/stock/reports/product-routes/types/product-routes-answer.type';
import { readIds } from 'src/stock/stock-route';
import { StockUserError } from 'src/stock/stock-errors';
import { findReadableAsPerson } from 'src/stock/stock-person-writes';
import { type RuleAction } from 'src/stock/types/rule-action.type';
import { type RuleProcureMethod } from 'src/stock/types/rule-procure-method.type';
import { byRouteSequence, categoryChain, categoryTotalRouteIds, productRoutesReport } from 'src/stock/utils/product-routes-report.util';
import { type RoutesReportRule } from 'src/stock/utils/types/routes-report-rule.type';

type Ordered = { id: string; sequence: number | null; createdAt: string };
type RouteRow = Ordered & { name: string | null };
type RuleRow = Ordered & {
  name: string | null;
  routeId: string;
  action: RuleAction;
  procureMethod: RuleProcureMethod;
  locationSrcId: string | null;
  locationDestId: string | null;
  pickingTypeId: string | null;
  warehouseId: string | null;
};
type LocationRow = { id: string; completeName: string | null; name: string | null; usage: string; warehouseId: string | null };
type OrderpointRow = {
  id: string;
  name: string | null;
  locationId: string | null;
  productMinQty: number | null;
  productMaxQty: number | null;
  createdAt: string;
};
type PutawayRow = Ordered & { locationInId: string | null; locationOut: { completeName: string | null; name: string | null } | null };

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

// The product list order: internal reference with the empty ones last, then name.
const byCodeAndName = (
  left: { id: string; defaultCode: string | null; name: string },
  right: { id: string; defaultCode: string | null; name: string },
) =>
  (left.defaultCode === null ? 1 : 0) - (right.defaultCode === null ? 1 : 0) ||
  compareText(left.defaultCode ?? '', right.defaultCode ?? '') ||
  compareText(left.name, right.name) ||
  compareText(left.id, right.id);

const locationName = (location: { completeName: string | null; name: string | null } | null) =>
  textOrNull(location?.completeName) ?? location?.name ?? '';

const readTemplate = async (templateId: string) => {
  const [template] = await findReadableAsPerson<{ id: string; categId: string | null }>(
    'productTemplates',
    'ProductTemplateFilterInput',
    { id: { eq: templateId } },
    'id categId',
  );

  if (template === undefined) {
    throw new StockUserError(PRODUCT_ROUTES_MESSAGES.notFound);
  }
  return template;
};

const readVariants = async (templateId: string) =>
  (
    await findReadableAsPerson<{ id: string; name: string | null; defaultCode: string | null }>(
      'productProducts',
      'ProductProductFilterInput',
      { productTmplId: { eq: templateId }, active: { eq: true } },
      'id name defaultCode',
    )
  )
    .map((variant) => ({ id: variant.id, name: variant.name ?? '', defaultCode: textOrNull(variant.defaultCode) }))
    .sort(byCodeAndName);

const readWarehouses = async () => {
  const warehouses = (
    await findReadableAsPerson<Ordered & { name: string | null }>(
      'stockWarehouses',
      'StockWarehouseFilterInput',
      { active: { eq: true } },
      'id name sequence createdAt',
    )
  ).sort(byRouteSequence);

  if (warehouses.length === 0) {
    throw new StockUserError(PRODUCT_ROUTES_MESSAGES.noWarehouse);
  }
  return warehouses;
};

type RouteLink = { stockRouteId: string | null };

// The category and its parents going up, nearest first.
const readCategoryChain = async (categId: string | null) => {
  if (categId === null) {
    return [];
  }
  const [category] = await findReadableAsPerson<{ id: string; parentPath: string | null }>(
    'productCategories',
    'ProductCategoryFilterInput',
    { id: { eq: categId } },
    'id parentPath',
  );

  return category === undefined ? [] : categoryChain(category.id, category.parentPath);
};

// The routes in the order the report lists them: the product's, then its
// category's and each parent category's, then each chosen warehouse's.
// Archived routes do not show.
const readRoutes = async (templateId: string, categId: string | null, warehouseIds: string[]) => {
  const categoryIds = await readCategoryChain(categId);
  const [productLinks, categoryLinks, warehouseLinks] = await Promise.all([
    findReadableAsPerson<RouteLink>(
      'stockRouteProducts',
      'StockRouteProductFilterInput',
      { productTemplateId: { eq: templateId } },
      'stockRouteId',
    ),
    findReadableAsPerson<RouteLink & { productCategoryId: string | null }>(
      'stockRouteCategs',
      'StockRouteCategFilterInput',
      { productCategoryId: { in: categoryIds } },
      'productCategoryId stockRouteId',
    ),
    findReadableAsPerson<RouteLink & { stockWarehouseId: string | null }>(
      'stockRouteWarehouses',
      'StockRouteWarehouseFilterInput',
      { stockWarehouseId: { in: warehouseIds } },
      'stockRouteId stockWarehouseId',
    ),
  ]);
  const linkedIds = [...new Set([...productLinks, ...categoryLinks, ...warehouseLinks].flatMap((link) => link.stockRouteId ?? []))];
  const routes = new Map(
    (
      await readInChunks(linkedIds, (part) =>
        findReadableAsPerson<RouteRow>(
          'stockRoutes',
          'StockRouteFilterInput',
          { id: { in: part }, active: { eq: true } },
          'id name sequence createdAt',
        ),
      )
    ).map((route) => [route.id, route]),
  );
  const inOrder = (links: RouteLink[]) =>
    links.flatMap((link) => (link.stockRouteId === null ? [] : (routes.get(link.stockRouteId) ?? []))).sort(byRouteSequence);
  const categoryRouteIds = categoryTotalRouteIds({
    categoryIds,
    links: categoryLinks.flatMap((link) =>
      link.productCategoryId === null || link.stockRouteId === null
        ? []
        : [{ productCategoryId: link.productCategoryId, stockRouteId: link.stockRouteId }],
    ),
    routes,
  });
  const groups = [
    inOrder(productLinks),
    categoryRouteIds.flatMap((id) => routes.get(id) ?? []),
    ...warehouseIds.map((warehouseId) => inOrder(warehouseLinks.filter((link) => link.stockWarehouseId === warehouseId))),
  ];

  return [...new Map(groups.flat().map((route) => [route.id, route])).values()];
};

const readRules = async (routeIds: string[]) => {
  const rules = (
    await readInChunks(routeIds, (part) =>
      findReadableAsPerson<RuleRow>(
        'stockRules',
        'StockRuleFilterInput',
        { routeId: { in: part }, active: { eq: true } },
        'id name sequence createdAt routeId action procureMethod locationSrcId locationDestId pickingTypeId warehouseId',
      ),
    )
  ).sort(byRouteSequence);
  const pickingTypeIds = [...new Set(rules.flatMap((rule) => rule.pickingTypeId ?? []))];
  const pickingTypes = new Map(
    (
      await readInChunks(pickingTypeIds, (part) =>
        findReadableAsPerson<{ id: string; name: string | null; defaultLocationDestId: string | null }>(
          'stockPickingTypes',
          'StockPickingTypeFilterInput',
          { id: { in: part } },
          'id name defaultLocationDestId',
        ),
      )
    ).map((type) => [type.id, type]),
  );

  return rules.map((rule): RoutesReportRule => {
    const pickingType = rule.pickingTypeId === null ? undefined : pickingTypes.get(rule.pickingTypeId);

    return {
      id: rule.id,
      name: rule.name ?? '',
      routeId: rule.routeId,
      action: rule.action,
      procureMethod: rule.procureMethod,
      locationSrcId: rule.locationSrcId,
      locationDestId: rule.locationDestId,
      pickingTypeDefaultDestId: pickingType?.defaultLocationDestId ?? null,
      pickingTypeName: textOrNull(pickingType?.name),
      warehouseId: rule.warehouseId,
    };
  });
};

// The variant's reordering and putaway rules; archived ones do not show.
const readVariantRules = async (variantId: string | null) =>
  variantId === null
    ? { orderpoints: [], putaways: [] }
    : {
        orderpoints: await findReadableAsPerson<OrderpointRow>(
          'stockWarehouseOrderpoints',
          'StockWarehouseOrderpointFilterInput',
          { productId: { eq: variantId }, active: { eq: true } },
          'id name locationId productMinQty productMaxQty createdAt',
        ),
        putaways: (
          await findReadableAsPerson<PutawayRow>(
            'stockPutawayRules',
            'StockPutawayRuleFilterInput',
            { productId: { eq: variantId }, active: { eq: true } },
            'id sequence createdAt locationInId locationOut { deletedAt completeName name }',
          )
        ).sort(byRouteSequence),
      };

export const readProductRoutes = async (body: Record<string, unknown>): Promise<ProductRoutesAnswer> => {
  const templateId = readText(body.productTemplateId);

  if (templateId === null) {
    throw new StockUserError(PRODUCT_ROUTES_MESSAGES.invalidRequest);
  }
  const template = await readTemplate(templateId);
  const [variants, warehouses] = await Promise.all([readVariants(template.id), readWarehouses()]);
  const variant = variants.find((candidate) => candidate.id === readText(body.productId)) ?? variants[0] ?? null;
  const asked = readIds(body, 'warehouseIds');
  const chosen = asked.length > 0 ? warehouses.filter((warehouse) => asked.includes(warehouse.id)) : [];
  const chosenIds = (chosen.length > 0 ? chosen : [warehouses[0]]).map((warehouse) => warehouse.id);
  const routes = await readRoutes(template.id, template.categId, chosenIds);
  const [rules, { orderpoints, putaways }] = await Promise.all([
    readRules(routes.map((route) => route.id)),
    readVariantRules(variant?.id ?? null),
  ]);
  const locationIds = [
    ...new Set([
      ...rules.flatMap((rule) => [rule.locationSrcId, rule.locationDestId, rule.pickingTypeDefaultDestId]),
      ...orderpoints.map((orderpoint) => orderpoint.locationId),
    ]),
  ].filter((id): id is string => id !== null);
  const locations = new Map(
    (
      await readInChunks(locationIds, (part) =>
        findReadableAsPerson<LocationRow>(
          'stockLocations',
          'StockLocationFilterInput',
          { id: { in: part } },
          'id completeName name usage warehouseId',
        ),
      )
    ).map((location) => [
      location.id,
      { id: location.id, name: locationName(location), usage: location.usage, warehouseId: location.warehouseId },
    ]),
  );
  // Reordering rules come in the order of their location's full name.
  const orderedOrderpoints = orderpoints
    .flatMap((orderpoint) => (orderpoint.locationId === null ? [] : [{ ...orderpoint, locationId: orderpoint.locationId }]))
    .sort(
      (left, right) =>
        compareText(locations.get(left.locationId)?.name ?? '', locations.get(right.locationId)?.name ?? '') ||
        compareText(left.createdAt, right.createdAt) ||
        compareText(left.id, right.id),
    );

  return {
    variants: variants.map((candidate) => ({ id: candidate.id, name: candidate.name })),
    variantId: variant?.id ?? null,
    warehouses: warehouses.map((warehouse) => ({ id: warehouse.id, name: warehouse.name ?? '' })),
    chosenWarehouseIds: chosenIds,
    report: productRoutesReport({
      routes: routes.map((route) => ({
        id: route.id,
        name: route.name ?? '',
        ruleIds: rules.filter((rule) => rule.routeId === route.id).map((rule) => rule.id),
      })),
      rules,
      locations,
      warehouseIds: chosenIds,
      orderpoints: orderedOrderpoints.map((orderpoint) => ({
        id: orderpoint.id,
        name: orderpoint.name ?? '',
        locationId: orderpoint.locationId,
        productMinQty: orderpoint.productMinQty ?? 0,
        productMaxQty: orderpoint.productMaxQty ?? 0,
      })),
      putaways: putaways.flatMap((putaway) =>
        putaway.locationInId === null
          ? []
          : [{ id: putaway.id, locationInId: putaway.locationInId, locationOutName: locationName(putaway.locationOut) }],
      ),
    }),
  };
};
