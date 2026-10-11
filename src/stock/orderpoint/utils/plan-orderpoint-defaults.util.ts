import { type OrderpointDefaultsInput } from 'src/stock/orderpoint/types/orderpoint-defaults-input.type';

// The warehouse follows a changed location (else the first warehouse) and the
// location follows a changed warehouse (its stock location); on a new rule
// they fill whichever is empty. When the other field has been saved again
// since this save, that later save decides. Max is raised to min when it is 0
// or below min, on a new rule or a min change.
export const planOrderpointDefaults = (
  input: OrderpointDefaultsInput,
): { kind: 'write'; data: Record<string, unknown> } | { kind: 'noWarehouse' } => {
  const { orderpoint, created } = input;
  const changed = new Set(input.changedFields);
  const data: Record<string, unknown> = {};
  let warehouseId = orderpoint.warehouseId;
  let locationId = orderpoint.locationId;

  if (created) {
    if (warehouseId === null) {
      warehouseId = (locationId === null ? null : input.locationWarehouseId) ?? input.firstWarehouseId;
    }
    if (warehouseId === null) {
      return { kind: 'noWarehouse' };
    }
    if (locationId === null) {
      locationId = input.warehouseLotStockIds.get(warehouseId) ?? null;
    }
  } else if (
    changed.has('warehouseId') &&
    !changed.has('locationId') &&
    warehouseId !== null &&
    locationId === input.saved.locationId
  ) {
    locationId = input.warehouseLotStockIds.get(warehouseId) ?? locationId;
  } else if (changed.has('locationId') && !changed.has('warehouseId') && warehouseId === input.saved.warehouseId) {
    warehouseId = input.locationWarehouseId ?? input.firstWarehouseId ?? warehouseId;
  }
  if (warehouseId !== orderpoint.warehouseId) {
    data.warehouseId = warehouseId;
  }
  if (locationId !== orderpoint.locationId) {
    data.locationId = locationId;
  }
  if (
    (created || changed.has('productMinQty')) &&
    (orderpoint.productMaxQty === 0 || orderpoint.productMaxQty < orderpoint.productMinQty) &&
    orderpoint.productMaxQty !== orderpoint.productMinQty
  ) {
    data.productMaxQty = orderpoint.productMinQty;
  }
  if (input.productCategoryId !== orderpoint.productCategoryId) {
    data.productCategoryId = input.productCategoryId;
  }
  return { kind: 'write', data };
};

// A max below min is refused when it was typed: on its own, or together with
// min (or on a new rule) as a number other than 0. A max left at 0 is raised
// to min instead.
export const isMaxTypedBelowMin = ({
  created,
  changedFields,
  productMinQty,
  productMaxQty,
}: {
  created: boolean;
  changedFields: string[];
  productMinQty: number;
  productMaxQty: number;
}) => {
  if (productMinQty <= productMaxQty) {
    return false;
  }
  if (created || changedFields.includes('productMinQty')) {
    return (created || changedFields.includes('productMaxQty')) && productMaxQty !== 0;
  }
  return changedFields.includes('productMaxQty');
};
