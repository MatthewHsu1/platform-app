import { type RouteRow } from 'src/stock/utils/types/route-row.type';
import { type WarehouseRoutingLocation } from 'src/stock/utils/types/warehouse-routing-location.type';
import { type RoutingWarehouse } from 'src/stock/utils/types/routing-warehouse.type';
import { type RuleRow } from 'src/stock/utils/types/rule-row.type';
import { type SupplierWarehouse } from 'src/stock/utils/types/supplier-warehouse.type';
import { type WarehouseChange } from 'src/stock/warehouse/types/warehouse-change.type';
import { type WarehouseEvent } from 'src/stock/warehouse/types/warehouse-event.type';

export type WarehouseRoutingInput = {
  event: WarehouseEvent;
  change: WarehouseChange;
  warehouse: RoutingWarehouse;
  locations: Map<string, WarehouseRoutingLocation>;
  vendorsLocationId: string;
  customersLocationId: string;
  transitLocationId: string | null;
  mtoRouteId: string | null;
  // Every route and rule the warehouse touches, archived ones too.
  routes: RouteRow[];
  rules: RuleRow[];
  // The warehouses named in `change.resupplyAdded`.
  suppliers: Map<string, SupplierWarehouse>;
  // The id of a row the plan makes, from its role alone, so a run that stopped
  // half-way and runs again finds the rows it made instead of making a second set.
  newId: (role: string) => string;
};
