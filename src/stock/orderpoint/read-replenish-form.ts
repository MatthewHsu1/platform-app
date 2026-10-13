import { PRODUCT_TYPE } from 'src/product/product-options.constant';
import { readText } from 'src/shared/utils/read-text.util';
import { readLocationQuantities } from 'src/stock/orderpoint/location-quantities';
import { ORDERPOINT_MESSAGES } from 'src/stock/orderpoint/orderpoint-messages.constant';
import {
  firstVariantId,
  offeredReplenishRoutes,
  replenishDatePlanned,
  replenishQuantity,
} from 'src/stock/orderpoint/utils/replenish-defaults.util';
import { readAllowedUnits } from 'src/stock/product/read-allowed-units';
import {
  productProducts,
  productTemplates,
  stockLocations,
  stockRouteCategTotals,
  stockRouteProducts,
  stockRoutes,
  stockRules,
  stockWarehouses,
} from 'src/stock/routing-records';
import { filterReadableIds } from 'src/stock/stock-access';
import { StockUserError } from 'src/stock/stock-errors';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type ReplenishChoices } from 'src/stock/orderpoint/types/replenish-choices.type';
import { type ReplenishForm } from 'src/stock/orderpoint/types/replenish-form.type';
import { type ReplenishFormRequest } from 'src/stock/orderpoint/types/replenish-form-request.type';
import { type ReplenishRoute } from 'src/stock/orderpoint/types/replenish-route.type';

type Variant = {
  id: string;
  name: string | null;
  defaultCode: string | null;
  createdAt: string;
};
type Warehouse = {
  id: string;
  name: string | null;
  sequence: number | null;
  createdAt: string;
  viewLocationId: string | null;
  lotStockId: string | null;
};

// A missing route keeps the product's default route; an empty one is no route.
export const readReplenishFormRequest = (body: Record<string, unknown>): ReplenishFormRequest => ({
  productTemplateId: readText(body.productTemplateId),
  productId: readText(body.productId),
  warehouseId: readText(body.warehouseId),
  ...('routeId' in body ? { routeId: readText(body.routeId) } : {}),
});

const VARIANT_SELECTION = 'id name defaultCode createdAt';

const named = (variant: Variant) => ({ ...variant, name: variant.name ?? '' });

const byWarehouseOrder = (left: Warehouse, right: Warehouse) =>
  (left.sequence ?? Number.MAX_SAFE_INTEGER) - (right.sequence ?? Number.MAX_SAFE_INTEGER) ||
  left.createdAt.localeCompare(right.createdAt);

// The product as the clicking user may see it. Opened from a product, every
// active variant can be picked; opened from a variant, only that one.
const readProduct = async ({ productTemplateId, productId }: ReplenishFormRequest) => {
  if (productTemplateId !== null) {
    const [readable] = await filterReadableIds('productTemplate', 'productTemplates', [productTemplateId]);
    const variants =
      readable === undefined
        ? []
        : await productProducts.find<Variant>(
            { productTmplId: { eq: readable }, active: { eq: true } },
            VARIANT_SELECTION,
          );

    return readable === undefined
      ? null
      : {
          templateId: readable,
          variants,
          variantId: variants.some((variant) => variant.id === productId)
            ? productId
            : firstVariantId(variants.map(named)),
          hasVariants: variants.length > 1,
        };
  }
  if (productId === null) {
    return null;
  }
  const [readable] = await filterReadableIds('productProduct', 'productProducts', [productId]);
  const [variant] =
    readable === undefined
      ? []
      : await productProducts.find<Variant & { productTmplId: string }>(
          { id: { eq: readable } },
          `${VARIANT_SELECTION} productTmplId`,
        );

  return variant === undefined
    ? null
    : {
        templateId: variant.productTmplId,
        variants: [variant],
        variantId: variant.id,
        hasVariants: false,
      };
};

// Active routes with their active rules, and whether each rule brings the
// goods into a warehouse.
const readReplenishRoutes = async (): Promise<ReplenishRoute[]> => {
  const [routes, rules] = await Promise.all([
    stockRoutes.find<{
      id: string;
      name: string | null;
      sequence: number | null;
      createdAt: string;
      productSelectable: boolean | null;
    }>({ active: { eq: true } }, 'id name sequence createdAt productSelectable'),
    stockRules.find<{
      routeId: string;
      delay: number | null;
      locationDestId: string;
    }>({ active: { eq: true } }, 'routeId delay locationDestId'),
  ]);
  const destinations = await stockLocations.find<{
    id: string;
    warehouseId: string | null;
  }>({ id: { in: [...new Set(rules.map((rule) => rule.locationDestId))] } }, 'id warehouseId');
  const warehouseOf = new Map(destinations.map((location) => [location.id, location.warehouseId]));

  return routes.map((route) => ({
    id: route.id,
    name: route.name ?? '',
    sequence: route.sequence ?? 0,
    createdAt: route.createdAt,
    active: true,
    productSelectable: route.productSelectable === true,
    rules: rules
      .filter((rule) => rule.routeId === route.id)
      .map((rule) => ({
        delay: rule.delay ?? 0,
        destinationInWarehouse: (warehouseOf.get(rule.locationDestId) ?? null) !== null,
      })),
  }));
};

export const readReplenishChoices = async (request: ReplenishFormRequest): Promise<ReplenishChoices> => {
  const product = await readProduct(request);
  const [template] =
    product === null
      ? []
      : await productTemplates.find<{
          id: string;
          productType: string;
          uomId: string;
          categId: string | null;
        }>({ id: { eq: product.templateId } }, 'id productType uomId categId');

  if (product === null || template === undefined) {
    throw new StockUserError(ORDERPOINT_MESSAGES.productNotFound);
  }
  if (template.productType !== PRODUCT_TYPE.CONSU) {
    throw new StockUserError(ORDERPOINT_MESSAGES.replenishOnlyGoods);
  }
  const [warehouses, routes, templateLinks, categoryLinks, uoms, units] = await Promise.all([
    stockWarehouses.find<Warehouse>({ active: { eq: true } }, 'id name sequence createdAt viewLocationId lotStockId'),
    readReplenishRoutes(),
    stockRouteProducts.find<{ stockRouteId: string }>({ productTemplateId: { eq: template.id } }, 'stockRouteId'),
    template.categId === null
      ? Promise.resolve([])
      : stockRouteCategTotals.find<{ stockRouteId: string }>(
          { productCategoryId: { eq: template.categId } },
          'stockRouteId',
        ),
    readResolvedUoms(),
    readAllowedUnits(new Map([[template.id, template.uomId]])),
  ]);
  const sortedWarehouses = [...warehouses].sort(byWarehouseOrder);
  const warehouse = sortedWarehouses.find((candidate) => candidate.id === request.warehouseId) ?? sortedWarehouses[0];
  const { defaultRouteId, routeIds: offeredIds } = offeredReplenishRoutes({
    routes,
    categoryRouteIds: categoryLinks.map((link) => link.stockRouteId),
    templateRouteIds: templateLinks.map((link) => link.stockRouteId),
  });
  const routeId = request.routeId === undefined ? defaultRouteId : request.routeId;
  const unitName = (uomId: string) => uoms.get(uomId)?.name ?? '';

  return {
    form: {
      hasVariants: product.hasVariants,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name ?? '',
      })),
      variantId: product.variantId,
      units: [...(units.get(template.id) ?? [template.uomId])].map((uomId) => ({
        id: uomId,
        name: unitName(uomId),
      })),
      uomId: template.uomId,
      productUomName: unitName(template.uomId),
      warehouses: sortedWarehouses.map((row) => ({
        id: row.id,
        name: row.name ?? '',
      })),
      warehouseId: warehouse?.id ?? null,
      routes: offeredIds.flatMap((id) => {
        const route = routes.find((candidate) => candidate.id === id);

        return route === undefined ? [] : [{ id: route.id, name: route.name }];
      }),
      routeId,
      datePlanned: replenishDatePlanned({
        now: new Date().toISOString(),
        route: routes.find((route) => route.id === routeId) ?? null,
      }),
    },
    viewLocationId: warehouse?.viewLocationId ?? null,
    lotStockId: warehouse?.lotStockId ?? null,
  };
};

// The pop-up with the product's forecast in the chosen warehouse, and the
// quantity that covers it.
export const readReplenishForm = async (request: ReplenishFormRequest): Promise<ReplenishForm> => {
  const { form, viewLocationId } = await readReplenishChoices(request);
  const forecast =
    form.variantId === null || viewLocationId === null
      ? 0
      : ((
          await readLocationQuantities({
            productIds: [form.variantId],
            locationId: viewLocationId,
            toDays: [null],
            digits: readStockSettings().productUnitDigits,
          })
        )
          .get(null)
          ?.get(form.variantId)?.virtualAvailable ?? 0);

  return { ...form, forecast, quantity: replenishQuantity(forecast) };
};
