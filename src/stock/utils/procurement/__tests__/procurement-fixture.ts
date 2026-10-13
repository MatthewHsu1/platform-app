import { product } from 'src/stock/utils/procurement/__tests__/routing-fixture';
import { type ConfirmingMove } from 'src/stock/utils/procurement/types/confirming-move.type';
import { type ProcurementContext } from 'src/stock/utils/procurement/types/procurement-context.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';
import { type ResolvedUom } from 'src/uom/utils/types/resolved-uom.type';

const UNIT: ResolvedUom = { id: 'unit', name: 'Units', factor: 1, rootId: 'unit', parentPath: 'unit/' };

export const procurementContext = (
  values: Partial<ProcurementContext> & { productList?: RoutingProduct[] } = {},
): ProcurementContext => {
  const { productList = [product()], ...rest } = values;

  return {
    runId: 'run-1',
    now: '2026-10-10T12:00:00.000Z',
    digits: 2,
    products: new Map(productList.map((row) => [row.id, row])),
    units: new Map([[UNIT.id, UNIT]]),
    quants: [],
    internalTransitLocationId: null,
    warehousePartnerIds: new Map(),
    pickingTypes: new Map(),
    existingMoveDestinations: new Map(),
    referenceNames: new Map(),
    ...rest,
  };
};

export const procurement = (values: Partial<Procurement> & Pick<Procurement, 'locationId'>): Procurement => ({
  productId: 'product',
  productQty: 1,
  productUomId: 'unit',
  name: 'test',
  origin: 'test',
  values: {},
  ...values,
});

export const confirmingMove = (
  values: Partial<ConfirmingMove> & Pick<ConfirmingMove, 'locationId' | 'locationDestId'>,
): ConfirmingMove => ({
  ref: { kind: 'existing', id: 'move-1' },
  productId: 'product',
  productUomId: 'unit',
  productUomQty: 1,
  date: '2026-10-10T12:00:00.000Z',
  dateDeadline: null,
  priority: 'NORMAL',
  procureMethod: 'MAKE_TO_STOCK',
  ruleId: null,
  ruleName: null,
  ruleProcureMethod: null,
  ruleRouteSupplierWhId: null,
  hasOrigins: false,
  warehouseId: null,
  pickingTypeId: null,
  routeIds: [],
  resultPackageTypeRouteIds: [],
  referenceIds: [],
  origin: null,
  pickingName: null,
  orderpointId: null,
  packagingUomId: null,
  partner: null,
  ...values,
});
