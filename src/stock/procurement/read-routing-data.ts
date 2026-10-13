import { findMany } from 'src/shared/triggers/records';
import { groupBy } from 'src/shared/utils/group-by.util';
import {
  productProducts,
  productTemplates,
  stockLocations,
  stockPackageTypeStockRouteRels,
  stockRouteCategTotals,
  stockRouteProducts,
  stockRoutes,
  stockRouteWarehouses,
  stockRules,
  uomUoms,
} from 'src/stock/routing-records';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';
import { type RoutingRoute } from 'src/stock/utils/procurement/types/routing-route.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';

const RULE_SELECTION =
  'id name action sequence routeId routeSequence locationSrcId locationDestId locationDestFromRule procureMethod pickingTypeId delay partnerAddressId partnerAddressPersonId propagateCancel warehouseId auto pushDomain createdAt';

type LocationRow = {
  id: string;
  name: string | null;
  completeName: string | null;
  locationId: string | null;
  parentPath: string | null;
  usage: LocationUsage;
  warehouseId: string | null;
};

type RuleRow = Omit<RoutingRule, 'routeSequence' | 'sequence' | 'delay'> & {
  routeSequence: number | null;
  sequence: number | null;
  delay: number | null;
};

const groupIds = <TRow>(rows: TRow[], key: (row: TRow) => string | null, value: (row: TRow) => string | null) => {
  const pairs = rows.flatMap((row) => {
    const groupKey = key(row);
    const groupValue = value(row);

    return groupKey === null || groupValue === null ? [] : [{ groupKey, groupValue }];
  });

  return new Map(
    [...groupBy(pairs, (pair) => pair.groupKey)].map(([groupKey, group]) => [groupKey, group.map((pair) => pair.groupValue)]),
  );
};

// Everything rule selection reads for these products: every location, the
// active rules and routes, and the routes of the products, categories,
// warehouses and package types. Reads as the application.
export const readRoutingData = async (
  productIds: string[],
): Promise<{ data: RoutingData; products: Map<string, RoutingProduct> }> => {
  const { locations, rules, routes, variants, warehouseLinks, packageTypeLinks, units } = await findMany<{
    locations: LocationRow[];
    rules: RuleRow[];
    routes: (Omit<RoutingRoute, 'sequence'> & { sequence: number | null })[];
    variants: { id: string; name: string | null; productTmplId: string }[];
    warehouseLinks: { stockWarehouseId: string; stockRouteId: string }[];
    packageTypeLinks: { stockPackageTypeId: string; stockRouteId: string }[];
    units: { id: string; packageTypeId: string | null }[];
  }>({
    locations: { of: stockLocations, filter: {}, selection: 'id name completeName locationId parentPath usage warehouseId' },
    rules: { of: stockRules, filter: { active: { eq: true } }, selection: RULE_SELECTION },
    routes: { of: stockRoutes, filter: { active: { eq: true } }, selection: 'id sequence createdAt supplierWhId' },
    variants: { of: productProducts, filter: { id: { in: productIds } }, selection: 'id name productTmplId' },
    warehouseLinks: { of: stockRouteWarehouses, filter: {}, selection: 'stockWarehouseId stockRouteId' },
    packageTypeLinks: { of: stockPackageTypeStockRouteRels, filter: {}, selection: 'stockPackageTypeId stockRouteId' },
    units: { of: uomUoms, filter: { packageTypeId: { is: 'NOT_NULL' } }, selection: 'id packageTypeId' },
  });
  const templateIds = [...new Set(variants.map((variant) => variant.productTmplId))];
  const { templates, templateLinks } = await findMany<{
    templates: { id: string; productType: string; isStorable: boolean | null; categId: string | null; uomId: string }[];
    templateLinks: { productTemplateId: string; stockRouteId: string }[];
  }>({
    templates: { of: productTemplates, filter: { id: { in: templateIds } }, selection: 'id productType isStorable categId uomId' },
    templateLinks: {
      of: stockRouteProducts,
      filter: { productTemplateId: { in: templateIds } },
      selection: 'productTemplateId stockRouteId',
    },
  });
  const categoryIds = [...new Set(templates.flatMap((template) => (template.categId === null ? [] : [template.categId])))];
  const categoryTotals = await stockRouteCategTotals.find<{ productCategoryId: string; stockRouteId: string }>(
    { productCategoryId: { in: categoryIds } },
    'productCategoryId stockRouteId',
  );
  const templateRoutes = groupIds(templateLinks, (link) => link.productTemplateId, (link) => link.stockRouteId);
  const templatesById = new Map(templates.map((template) => [template.id, template]));
  const products = new Map<string, RoutingProduct>(
    variants.flatMap((variant): [string, RoutingProduct][] => {
      const template = templatesById.get(variant.productTmplId);
      return template === undefined
        ? []
        : [
            [
              variant.id,
              {
                id: variant.id,
                name: variant.name ?? '',
                productType: template.productType,
                isStorable: template.isStorable === true,
                categoryId: template.categId,
                uomId: template.uomId,
                routeIds: templateRoutes.get(template.id) ?? [],
              },
            ],
          ];
    }),
  );

  return {
    products,
    data: {
      locations: new Map(
        locations.map((location) => [
          location.id,
          {
            id: location.id,
            name: location.name ?? '',
            completeName: location.completeName ?? location.name ?? '',
            parentId: location.locationId,
            parentPath: location.parentPath ?? `${location.id}/`,
            usage: location.usage,
            warehouseId: location.warehouseId,
          },
        ]),
      ),
      rules: rules.map((rule) => ({
        ...rule,
        routeSequence: rule.routeSequence ?? 0,
        sequence: rule.sequence ?? 0,
        delay: rule.delay ?? 0,
      })),
      routes: new Map(routes.map((route) => [route.id, { ...route, sequence: route.sequence ?? 0 }])),
      categoryTotalRouteIds: groupIds(categoryTotals, (row) => row.productCategoryId, (row) => row.stockRouteId),
      warehouseRouteIds: groupIds(warehouseLinks, (row) => row.stockWarehouseId, (row) => row.stockRouteId),
      packageTypeRouteIds: groupIds(packageTypeLinks, (row) => row.stockPackageTypeId, (row) => row.stockRouteId),
      unitPackageTypeIds: new Map(units.map((unit) => [unit.id, unit.packageTypeId])),
    },
  };
};
