import { sameValue } from 'src/shared/utils/same-value.util';
import { readStockSettings } from 'src/stock/stock-settings';
import {
  productProducts,
  productTemplates,
  stockLocations,
  stockMoves,
  stockQuants,
  stockWarehouses,
} from 'src/stock/stock-records';
import {
  OPEN_MOVE_STATES_FOR_FORECAST,
  planProductQuantities,
} from 'src/stock/utils/plan-product-quantities.util';
import { type MoveState } from 'src/stock/types/move-state.type';

type VariantQuantities = {
  id: string;
  productTmplId: string;
  qtyAvailable: number | null;
  freeQty: number | null;
  incomingQty: number | null;
  outgoingQty: number | null;
  virtualAvailable: number | null;
  productTmpl: { productType: string } | null;
};

type TemplateRow = {
  id: string;
  qtyAvailable: number | null;
  incomingQty: number | null;
  outgoingQty: number | null;
  virtualAvailable: number | null;
};

const QUANTITY_FIELDS = 'qtyAvailable freeQty incomingQty outgoingQty virtualAvailable';

// Every location under the view location of an active warehouse,
// archived locations included.
export const readScopeLocationIds = async () => {
  const warehouses = await stockWarehouses.find<{ viewLocationId: string | null }>(
    { active: { eq: true } },
    'viewLocationId',
  );
  const viewIds = warehouses.flatMap(({ viewLocationId }) => (viewLocationId === null ? [] : [viewLocationId]));

  if (viewIds.length === 0) {
    return new Set<string>();
  }

  const views = await stockLocations.find<{ parentPath: string | null }>({ id: { in: viewIds } }, 'parentPath');
  const paths = views.flatMap(({ parentPath }) => (parentPath === null ? [] : [parentPath]));

  if (paths.length === 0) {
    return new Set<string>();
  }

  const scoped = await stockLocations.find<{ id: string }>(
    { or: paths.map((path) => ({ parentPath: { like: `${path}%` } })) },
    'id',
  );

  return new Set(scoped.map(({ id }) => id));
};

const changedValues = (row: Record<string, unknown>, wanted: Record<string, number>) =>
  Object.fromEntries(Object.entries(wanted).filter(([field, value]) => !sameValue(row[field], value)));

export const recomputeProductQuantities = async (productIds: string[]) => {
  const ids = [...new Set(productIds)];

  if (ids.length === 0) {
    return;
  }

  const touched = await productProducts.find<{ productTmplId: string }>({ id: { in: ids } }, 'productTmplId');
  const templateIds = [...new Set(touched.map(({ productTmplId }) => productTmplId))];

  if (templateIds.length === 0) {
    return;
  }

  // The product's totals need every variant, so all variants of the touched products are recomputed.
  const variants = await productProducts.find<VariantQuantities>(
    { productTmplId: { in: templateIds } },
    `id productTmplId ${QUANTITY_FIELDS} productTmpl { productType }`,
  );
  const variantIds = variants.map(({ id }) => id);
  const [scopeLocationIds, quants, moves, templates] = await Promise.all([
    readScopeLocationIds(),
    stockQuants.find<{
      productId: string;
      locationId: string;
      quantity: number;
      reservedQuantity: number;
      removalDate: string | null;
    }>({ productId: { in: variantIds } }, 'productId locationId quantity reservedQuantity removalDate'),
    stockMoves.find<{
      productId: string;
      state: MoveState;
      productQty: number | null;
      locationId: string | null;
      locationDestId: string | null;
      locationFinalId: string | null;
    }>(
      { productId: { in: variantIds }, state: { in: OPEN_MOVE_STATES_FOR_FORECAST } },
      'productId state productQty locationId locationDestId locationFinalId',
    ),
    productTemplates.find<TemplateRow>(
      { id: { in: templateIds } },
      'id qtyAvailable incomingQty outgoingQty virtualAvailable',
    ),
  ]);
  const plan = planProductQuantities({
    products: variants.map((variant) => ({
      id: variant.id,
      templateId: variant.productTmplId,
      productType: variant.productTmpl?.productType ?? '',
    })),
    scopeLocationIds,
    quants,
    moves,
    digits: readStockSettings().productUnitDigits,
    now: new Date(),
  });

  for (const variant of variants) {
    const wanted = plan.products.get(variant.id);

    if (wanted !== undefined) {
      await productProducts.update(variant.id, changedValues(variant, wanted));
    }
  }

  for (const template of templates) {
    const wanted = plan.templates.get(template.id);

    if (wanted !== undefined) {
      await productTemplates.update(template.id, changedValues(template, wanted));
    }
  }
};
