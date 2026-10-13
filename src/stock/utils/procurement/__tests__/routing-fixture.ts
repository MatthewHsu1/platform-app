import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type RoutingData } from 'src/stock/utils/procurement/types/routing-data.type';
import { type RoutingLocation } from 'src/stock/utils/procurement/types/routing-location.type';
import { type RoutingProduct } from 'src/stock/utils/procurement/types/routing-product.type';
import { type RoutingRoute } from 'src/stock/utils/procurement/types/routing-route.type';
import { type RoutingRule } from 'src/stock/utils/procurement/types/routing-rule.type';

type LocationSpec = { name?: string; parentId?: string | null; usage?: LocationUsage; warehouseId?: string | null };

// Locations with names, full names and paths built from the parent chain.
export const locations = (specs: Record<string, LocationSpec>) => {
  const result = new Map<string, RoutingLocation>();
  const resolve = (id: string): RoutingLocation => {
    const known = result.get(id);
    if (known !== undefined) {
      return known;
    }
    const spec = specs[id];
    const parent = spec.parentId ? resolve(spec.parentId) : undefined;
    const name = spec.name ?? id;
    const usage = spec.usage ?? 'INTERNAL';
    const location: RoutingLocation = {
      id,
      name,
      completeName: parent !== undefined && usage !== 'VIEW' ? `${parent.completeName}/${name}` : name,
      parentId: spec.parentId ?? null,
      parentPath: `${parent?.parentPath ?? ''}${id}/`,
      usage,
      warehouseId: spec.warehouseId ?? parent?.warehouseId ?? null,
    };
    result.set(id, location);
    return location;
  };
  Object.keys(specs).forEach(resolve);
  return result;
};

let createdAtCounter = 0;
const nextCreatedAt = () => {
  createdAtCounter += 1;
  return new Date(Date.UTC(2026, 9, 8) + createdAtCounter * 1_000).toISOString();
};

export const route = (id: string, values: Partial<RoutingRoute> = {}): RoutingRoute => ({
  id,
  sequence: 0,
  createdAt: nextCreatedAt(),
  supplierWhId: null,
  ...values,
});

export const rule = (
  id: string,
  values: Partial<RoutingRule> & Pick<RoutingRule, 'routeId' | 'locationDestId' | 'pickingTypeId'>,
  routes: RoutingRoute[] = [],
): RoutingRule => ({
  name: id,
  action: 'PULL',
  sequence: 20,
  routeSequence: routes.find((candidate) => candidate.id === values.routeId)?.sequence ?? 0,
  locationSrcId: null,
  locationDestFromRule: false,
  procureMethod: 'MAKE_TO_STOCK',
  delay: 0,
  partnerAddressId: null,
  partnerAddressPersonId: null,
  propagateCancel: false,
  warehouseId: null,
  auto: 'MANUAL',
  pushDomain: null,
  createdAt: nextCreatedAt(),
  id,
  ...values,
});

export const product = (values: Partial<RoutingProduct> = {}): RoutingProduct => ({
  id: 'product',
  name: 'Desk Combination',
  productType: 'CONSU',
  isStorable: true,
  categoryId: null,
  uomId: 'unit',
  routeIds: [],
  ...values,
});

export const routingData = ({
  locationMap,
  routes,
  rules,
  categoryTotalRouteIds = {},
  warehouseRouteIds = {},
  packageTypeRouteIds = {},
  unitPackageTypeIds = {},
}: {
  locationMap: Map<string, RoutingLocation>;
  routes: RoutingRoute[];
  rules: RoutingRule[];
  categoryTotalRouteIds?: Record<string, string[]>;
  warehouseRouteIds?: Record<string, string[]>;
  packageTypeRouteIds?: Record<string, string[]>;
  unitPackageTypeIds?: Record<string, string | null>;
}): RoutingData => ({
  locations: locationMap,
  routes: new Map(routes.map((row) => [row.id, row])),
  rules,
  categoryTotalRouteIds: new Map(Object.entries(categoryTotalRouteIds)),
  warehouseRouteIds: new Map(Object.entries(warehouseRouteIds)),
  packageTypeRouteIds: new Map(Object.entries(packageTypeRouteIds)),
  unitPackageTypeIds: new Map(Object.entries(unitPackageTypeIds)),
});

// One warehouse "WH" as the warehouse planner makes it, with the steps given.
export const warehouseWorld = ({
  delivery = 'SHIP_ONLY',
  reception = 'ONE_STEP',
}: { delivery?: 'SHIP_ONLY' | 'PICK_SHIP' | 'PICK_PACK_SHIP'; reception?: 'ONE_STEP' | 'TWO_STEPS' | 'THREE_STEPS' } = {}) => {
  const locationMap = locations({
    vendors: { name: 'Vendors', usage: 'SUPPLIER' },
    customers: { name: 'Customers', usage: 'CUSTOMER' },
    transit: { name: 'Inter-warehouse transit', usage: 'TRANSIT' },
    wh: { name: 'WH', usage: 'VIEW', warehouseId: 'WH' },
    stock: { name: 'Stock', parentId: 'wh' },
    shelf1: { name: 'Shelf 1', parentId: 'stock' },
    input: { name: 'Input', parentId: 'wh' },
    qc: { name: 'Quality Control', parentId: 'wh' },
    output: { name: 'Output', parentId: 'wh' },
    pack: { name: 'Packing Zone', parentId: 'wh' },
  });
  const reception1 = route('reception', { sequence: 50 });
  const delivery1 = route('delivery', { sequence: 60 });
  const routes = [reception1, delivery1];
  const receptionRules: Record<string, RoutingRule[]> = {
    ONE_STEP: [rule('in', { routeId: 'reception', locationSrcId: 'vendors', locationDestId: 'stock', pickingTypeId: 'IN', warehouseId: 'WH' }, routes)],
    TWO_STEPS: [
      rule('in', { routeId: 'reception', locationSrcId: 'vendors', locationDestId: 'stock', pickingTypeId: 'IN', warehouseId: 'WH', propagateCancel: true }, routes),
      rule('store', { routeId: 'reception', action: 'PUSH', locationSrcId: 'input', locationDestId: 'stock', pickingTypeId: 'STOR', warehouseId: 'WH', procureMethod: 'MAKE_TO_ORDER' }, routes),
    ],
    THREE_STEPS: [
      rule('in', { routeId: 'reception', locationSrcId: 'vendors', locationDestId: 'stock', pickingTypeId: 'IN', warehouseId: 'WH', propagateCancel: true }, routes),
      rule('qc', { routeId: 'reception', action: 'PUSH', locationSrcId: 'input', locationDestId: 'qc', pickingTypeId: 'QC', warehouseId: 'WH', procureMethod: 'MAKE_TO_ORDER', propagateCancel: true }, routes),
      rule('store', { routeId: 'reception', action: 'PUSH', locationSrcId: 'qc', locationDestId: 'stock', pickingTypeId: 'STOR', warehouseId: 'WH', procureMethod: 'MAKE_TO_ORDER' }, routes),
    ],
  };
  const deliveryRules: Record<string, RoutingRule[]> = {
    SHIP_ONLY: [rule('out', { routeId: 'delivery', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeId: 'OUT', warehouseId: 'WH' }, routes)],
    PICK_SHIP: [
      rule('pick', { routeId: 'delivery', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeId: 'PICK', warehouseId: 'WH' }, routes),
      rule('ship', { routeId: 'delivery', action: 'PUSH', locationSrcId: 'output', locationDestId: 'customers', pickingTypeId: 'OUT', warehouseId: 'WH', procureMethod: 'MAKE_TO_ORDER' }, routes),
    ],
    PICK_PACK_SHIP: [
      rule('pick', { routeId: 'delivery', locationSrcId: 'stock', locationDestId: 'customers', pickingTypeId: 'PICK', warehouseId: 'WH' }, routes),
      rule('packing', { routeId: 'delivery', action: 'PUSH', locationSrcId: 'pack', locationDestId: 'output', pickingTypeId: 'PACK', warehouseId: 'WH', procureMethod: 'MAKE_TO_ORDER' }, routes),
      rule('ship', { routeId: 'delivery', action: 'PUSH', locationSrcId: 'output', locationDestId: 'customers', pickingTypeId: 'OUT', warehouseId: 'WH', procureMethod: 'MAKE_TO_ORDER' }, routes),
    ],
  };

  return {
    locationMap,
    routes,
    rules: [...receptionRules[reception], ...deliveryRules[delivery]],
    warehouseRouteIds: { WH: ['reception', 'delivery'] },
  };
};
