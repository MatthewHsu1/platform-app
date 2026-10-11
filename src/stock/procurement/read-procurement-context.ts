import { findMany } from 'src/shared/triggers/records';
import { STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import { stockLocations, stockMoves, stockPickingTypes, stockQuants, stockReferences, stockWarehouses } from 'src/stock/routing-records';
import { readStockSettings } from 'src/stock/stock-settings';
import { readResolvedUoms } from 'src/stock/stock-uoms';
import { type ProcurementContext } from 'src/stock/utils/procurement/types/procurement-context.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';

// What planning a procurement reads besides the rules: units, free stock,
// warehouse partners, operation type defaults, and the moves it feeds. Reads as the application.
export const readProcurementContext = async ({
  runId,
  products,
  existingMoveIds,
  referenceIds,
}: {
  runId: string;
  products: Map<string, RoutingProduct>;
  existingMoveIds: string[];
  referenceIds: string[];
}): Promise<ProcurementContext> => {
  const [units, rows] = await Promise.all([
    readResolvedUoms(),
    findMany<{
      quants: { productId: string; locationId: string; quantity: number | null; reservedQuantity: number | null }[];
      warehouses: { id: string; partnerId: string | null }[];
      pickingTypes: { id: string; warehouseId: string | null; defaultLocationDestId: string | null }[];
      existingMoves: { id: string; locationDestId: string | null }[];
      references: { id: string; name: string | null }[];
      transit: { id: string }[];
    }>({
      quants: {
        of: stockQuants,
        filter: { productId: { in: [...products.keys()] } },
        selection: 'productId locationId quantity reservedQuantity',
      },
      warehouses: { of: stockWarehouses, filter: {}, selection: 'id partnerId' },
      pickingTypes: { of: stockPickingTypes, filter: {}, selection: 'id warehouseId defaultLocationDestId' },
      existingMoves: { of: stockMoves, filter: { id: { in: [...new Set(existingMoveIds)] } }, selection: 'id locationDestId' },
      references: { of: stockReferences, filter: { id: { in: [...new Set(referenceIds)] } }, selection: 'id name' },
      transit: { of: stockLocations, filter: { seedKey: { eq: STOCK_SEED_KEYS.transit } }, selection: 'id' },
    }),
  ]);

  return {
    runId,
    now: new Date().toISOString(),
    digits: readStockSettings().productUnitDigits,
    products,
    units,
    quants: rows.quants.map((quant) => ({
      productId: quant.productId,
      locationId: quant.locationId,
      quantity: quant.quantity ?? 0,
      reservedQuantity: quant.reservedQuantity ?? 0,
    })),
    internalTransitLocationId: rows.transit[0]?.id ?? null,
    warehousePartnerIds: new Map(rows.warehouses.map((warehouse) => [warehouse.id, warehouse.partnerId])),
    pickingTypes: new Map(
      rows.pickingTypes.map((type) => [type.id, { warehouseId: type.warehouseId, defaultLocationDestId: type.defaultLocationDestId }]),
    ),
    existingMoveDestinations: new Map(rows.existingMoves.map((move) => [move.id, move.locationDestId])),
    referenceNames: new Map(rows.references.flatMap((reference) => (reference.name === null ? [] : [[reference.id, reference.name]]))),
  };
};
