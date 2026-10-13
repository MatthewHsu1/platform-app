import { PICKING_STATE, SCRAP_STATE } from 'src/stock/stock-options.constant';
import { type ScrapDefaultsPlan } from 'src/stock/utils/types/scrap-defaults-plan.type';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { type ScrapState } from 'src/stock/types/scrap-state.type';

export const NO_WAREHOUSE_REASON = 'Please create a warehouse for this company first.';

// A value the user typed on create is kept; a new transfer or product recomputes the values that follow it.
export const planScrapDefaults = ({
  operation,
  productChanged,
  pickingChanged,
  scrap,
  productUomId,
  picking,
  firstWarehouseLotStockId,
  oldestInventoryLocationId,
}: {
  operation: 'created' | 'updated';
  productChanged: boolean;
  pickingChanged: boolean;
  scrap: { productId: string | null; productUomId: string | null; locationId: string | null; scrapLocationId: string | null; state: ScrapState };
  productUomId: string | null;
  picking: { state: PickingState; locationId: string | null; locationDestId: string | null } | null;
  firstWarehouseLotStockId: string | null;
  oldestInventoryLocationId: string | null;
}): ScrapDefaultsPlan => {
  if (scrap.state === SCRAP_STATE.DONE) {
    return { kind: 'write', data: {} };
  }
  const created = operation === 'created';
  const data: Record<string, unknown> = {};

  if (productUomId !== null && ((created && scrap.productUomId === null) || productChanged)) {
    data.productUomId = productUomId;
  }
  if ((created && scrap.locationId === null) || pickingChanged) {
    const location =
      picking === null
        ? firstWarehouseLotStockId
        : picking.state === PICKING_STATE.DONE
          ? picking.locationDestId
          : picking.locationId;

    if (location === null) {
      return { kind: 'refuse', reason: NO_WAREHOUSE_REASON };
    }
    data.locationId = location;
  }
  if (created && scrap.scrapLocationId === null && oldestInventoryLocationId !== null) {
    data.scrapLocationId = oldestInventoryLocationId;
  }

  return {
    kind: 'write',
    data: Object.fromEntries(
      Object.entries(data).filter(([field, value]) => (scrap as unknown as Record<string, unknown>)[field] !== value),
    ),
  };
};
