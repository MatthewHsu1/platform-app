import { type SelectFieldOption } from 'src/shared/fields';
import { type MoveState } from 'src/stock/types/move-state.type';

const option = (value: string, label: string, color: SelectFieldOption['color']): SelectFieldOption => ({
  value,
  label,
  color,
});

export const LOCATION_USAGE = {
  SUPPLIER: 'SUPPLIER',
  VIEW: 'VIEW',
  INTERNAL: 'INTERNAL',
  CUSTOMER: 'CUSTOMER',
  INVENTORY: 'INVENTORY',
  PRODUCTION: 'PRODUCTION',
  TRANSIT: 'TRANSIT',
} as const;
export const LOCATION_USAGE_OPTIONS = [
  option(LOCATION_USAGE.SUPPLIER, 'Vendor', 'purple'),
  option(LOCATION_USAGE.VIEW, 'Virtual', 'gray'),
  option(LOCATION_USAGE.INTERNAL, 'Internal', 'blue'),
  option(LOCATION_USAGE.CUSTOMER, 'Customer', 'green'),
  option(LOCATION_USAGE.INVENTORY, 'Inventory Loss', 'orange'),
  option(LOCATION_USAGE.PRODUCTION, 'Production', 'amber'),
  option(LOCATION_USAGE.TRANSIT, 'Transit', 'sky'),
];

export const RECEPTION_STEPS = { ONE_STEP: 'ONE_STEP', TWO_STEPS: 'TWO_STEPS', THREE_STEPS: 'THREE_STEPS' } as const;
export const RECEPTION_STEPS_OPTIONS = [
  option(RECEPTION_STEPS.ONE_STEP, 'Receive and Store (1 step)', 'green'),
  option(RECEPTION_STEPS.TWO_STEPS, 'Receive then Store (2 steps)', 'blue'),
  option(RECEPTION_STEPS.THREE_STEPS, 'Receive then Quality Control then Store (3 steps)', 'purple'),
];

export const DELIVERY_STEPS = { SHIP_ONLY: 'SHIP_ONLY', PICK_SHIP: 'PICK_SHIP', PICK_PACK_SHIP: 'PICK_PACK_SHIP' } as const;
export const DELIVERY_STEPS_OPTIONS = [
  option(DELIVERY_STEPS.SHIP_ONLY, 'Deliver (1 step)', 'green'),
  option(DELIVERY_STEPS.PICK_SHIP, 'Pick then Deliver (2 steps)', 'blue'),
  option(DELIVERY_STEPS.PICK_PACK_SHIP, 'Pick then Pack then Deliver (3 steps)', 'purple'),
];

export const PICKING_TYPE_CODE = { INCOMING: 'INCOMING', OUTGOING: 'OUTGOING', INTERNAL: 'INTERNAL' } as const;
export const PICKING_TYPE_CODE_OPTIONS = [
  option(PICKING_TYPE_CODE.INCOMING, 'Receipt', 'green'),
  option(PICKING_TYPE_CODE.OUTGOING, 'Delivery', 'blue'),
  option(PICKING_TYPE_CODE.INTERNAL, 'Internal Transfer', 'gray'),
];

export const RESERVATION_METHOD = { AT_CONFIRM: 'AT_CONFIRM', MANUAL: 'MANUAL', BY_DATE: 'BY_DATE' } as const;
export const RESERVATION_METHOD_OPTIONS = [
  option(RESERVATION_METHOD.AT_CONFIRM, 'At Confirmation', 'green'),
  option(RESERVATION_METHOD.MANUAL, 'Manually', 'gray'),
  option(RESERVATION_METHOD.BY_DATE, 'Before scheduled date', 'blue'),
];

export const CREATE_BACKORDER = { ASK: 'ASK', ALWAYS: 'ALWAYS', NEVER: 'NEVER' } as const;
export const CREATE_BACKORDER_OPTIONS = [
  option(CREATE_BACKORDER.ASK, 'Ask', 'blue'),
  option(CREATE_BACKORDER.ALWAYS, 'Always', 'green'),
  option(CREATE_BACKORDER.NEVER, 'Never', 'red'),
];

export const MOVE_TYPE = { DIRECT: 'DIRECT', ONE: 'ONE' } as const;
export const MOVE_TYPE_OPTIONS = [
  option(MOVE_TYPE.DIRECT, 'As soon as possible', 'green'),
  option(MOVE_TYPE.ONE, 'When all products are ready', 'blue'),
];

export const PICKING_STATE = {
  DRAFT: 'DRAFT',
  WAITING: 'WAITING',
  CONFIRMED: 'CONFIRMED',
  ASSIGNED: 'ASSIGNED',
  DONE: 'DONE',
  CANCEL: 'CANCEL',
} as const;
export const PICKING_STATE_OPTIONS = [
  option(PICKING_STATE.DRAFT, 'Draft', 'gray'),
  option(PICKING_STATE.WAITING, 'Waiting Another Operation', 'orange'),
  option(PICKING_STATE.CONFIRMED, 'Waiting', 'amber'),
  option(PICKING_STATE.ASSIGNED, 'Ready', 'blue'),
  option(PICKING_STATE.DONE, 'Done', 'green'),
  option(PICKING_STATE.CANCEL, 'Cancelled', 'red'),
];

export const MOVE_STATE = {
  DRAFT: 'DRAFT',
  WAITING: 'WAITING',
  CONFIRMED: 'CONFIRMED',
  PARTIALLY_AVAILABLE: 'PARTIALLY_AVAILABLE',
  ASSIGNED: 'ASSIGNED',
  DONE: 'DONE',
  CANCEL: 'CANCEL',
} as const;
export const MOVE_STATE_OPTIONS = [
  option(MOVE_STATE.DRAFT, 'New', 'gray'),
  option(MOVE_STATE.WAITING, 'Waiting Another Move', 'orange'),
  option(MOVE_STATE.CONFIRMED, 'Waiting', 'amber'),
  option(MOVE_STATE.PARTIALLY_AVAILABLE, 'Partially Available', 'sky'),
  option(MOVE_STATE.ASSIGNED, 'Available', 'blue'),
  option(MOVE_STATE.DONE, 'Done', 'green'),
  option(MOVE_STATE.CANCEL, 'Cancelled', 'red'),
];
// Lines of moves in these states hold a reservation (the reserved recompute sums them).
export const OPEN_LINE_STATES: MoveState[] = [
  MOVE_STATE.CONFIRMED,
  MOVE_STATE.WAITING,
  MOVE_STATE.PARTIALLY_AVAILABLE,
  MOVE_STATE.ASSIGNED,
];

export const PRIORITY = { NORMAL: 'NORMAL', URGENT: 'URGENT' } as const;
export const PRIORITY_OPTIONS = [option(PRIORITY.NORMAL, 'Normal', 'gray'), option(PRIORITY.URGENT, 'Urgent', 'red')];

export const PROCURE_METHOD = { MAKE_TO_STOCK: 'MAKE_TO_STOCK', MAKE_TO_ORDER: 'MAKE_TO_ORDER' } as const;
export const PROCURE_METHOD_OPTIONS = [
  option(PROCURE_METHOD.MAKE_TO_STOCK, 'Default: Take From Stock', 'gray'),
  option(PROCURE_METHOD.MAKE_TO_ORDER, 'Advanced: Apply Procurement Rules', 'purple'),
];

export const SCRAP_STATE = { DRAFT: 'DRAFT', DONE: 'DONE' } as const;
export const SCRAP_STATE_OPTIONS = [option(SCRAP_STATE.DRAFT, 'Draft', 'gray'), option(SCRAP_STATE.DONE, 'Done', 'green')];

export const PACKAGING_RESERVE_METHOD = { FULL: 'FULL', PARTIAL: 'PARTIAL' } as const;
export const PACKAGING_RESERVE_METHOD_OPTIONS = [
  option(PACKAGING_RESERVE_METHOD.FULL, 'Reserve Only Full Packagings', 'blue'),
  option(PACKAGING_RESERVE_METHOD.PARTIAL, 'Reserve Partial Packagings', 'gray'),
];

export const PRODUCT_LABEL_FORMAT = {
  DYMO: 'DYMO',
  PRICE_2X7: 'PRICE_2X7',
  PRICE_4X7: 'PRICE_4X7',
  PLAIN_4X12: 'PLAIN_4X12',
  PRICE_4X12: 'PRICE_4X12',
  ZPL: 'ZPL',
  ZPL_PRICE: 'ZPL_PRICE',
} as const;
export const PRODUCT_LABEL_FORMAT_OPTIONS = [
  option(PRODUCT_LABEL_FORMAT.DYMO, 'Dymo', 'gray'),
  option(PRODUCT_LABEL_FORMAT.PRICE_2X7, '2 x 7 with price', 'blue'),
  option(PRODUCT_LABEL_FORMAT.PRICE_4X7, '4 x 7 with price', 'blue'),
  option(PRODUCT_LABEL_FORMAT.PLAIN_4X12, '4 x 12', 'gray'),
  option(PRODUCT_LABEL_FORMAT.PRICE_4X12, '4 x 12 with price', 'blue'),
  option(PRODUCT_LABEL_FORMAT.ZPL, 'ZPL Labels', 'purple'),
  option(PRODUCT_LABEL_FORMAT.ZPL_PRICE, 'ZPL Labels with price', 'purple'),
];

export const LOT_LABEL_FORMAT = {
  LOTS_4X12: 'LOTS_4X12',
  UNITS_4X12: 'UNITS_4X12',
  ZPL_LOTS: 'ZPL_LOTS',
  ZPL_UNITS: 'ZPL_UNITS',
} as const;
export const LOT_LABEL_FORMAT_OPTIONS = [
  option(LOT_LABEL_FORMAT.LOTS_4X12, '4 x 12 - One per lot/SN', 'blue'),
  option(LOT_LABEL_FORMAT.UNITS_4X12, '4 x 12 - One per unit', 'blue'),
  option(LOT_LABEL_FORMAT.ZPL_LOTS, 'ZPL Labels - One per lot/SN', 'purple'),
  option(LOT_LABEL_FORMAT.ZPL_UNITS, 'ZPL Labels - One per unit', 'purple'),
];

export const PACKAGE_LABEL_TO_PRINT = { PDF: 'PDF', ZPL: 'ZPL' } as const;
export const PACKAGE_LABEL_TO_PRINT_OPTIONS = [
  option(PACKAGE_LABEL_TO_PRINT.PDF, 'PDF', 'red'),
  option(PACKAGE_LABEL_TO_PRINT.ZPL, 'ZPL', 'purple'),
];

export const PRODUCT_TRACKING = { SERIAL: 'SERIAL', LOT: 'LOT', NONE: 'NONE' } as const;
export const PRODUCT_TRACKING_OPTIONS = [
  option(PRODUCT_TRACKING.SERIAL, 'By Unique Serial Number', 'purple'),
  option(PRODUCT_TRACKING.LOT, 'By Lots', 'blue'),
  option(PRODUCT_TRACKING.NONE, 'By Quantity', 'gray'),
];

export const STOCK_SEED_KEYS = {
  suppliers: 'stock.stock_location_suppliers',
  customers: 'stock.stock_location_customers',
  inventory: 'stock.location_inventory',
  production: 'stock.location_production',
  scrap: 'stock.location_scrap',
  transit: 'stock.location_internal_transit',
  warehouse0: 'stock.warehouse0',
  scrapSequence: 'stock.sequence_scrap',
  lotSequence: 'stock.sequence_production_lots',
  packageSequence: 'stock.seq_package',
  orderpointSequence: 'stock.sequence_mrp_op',
  batchSequence: 'stock_picking_batch.seq_picking_batch',
  waveSequence: 'stock_picking_batch.seq_picking_wave',
} as const;

// Who orders for a reordering rule: the daily job (AUTO) or a person from the
// replenishment screen (MANUAL).
export const ORDERPOINT_TRIGGER = { AUTO: 'AUTO', MANUAL: 'MANUAL' } as const;
export const ORDERPOINT_TRIGGER_OPTIONS = [
  option(ORDERPOINT_TRIGGER.AUTO, 'Auto', 'green'),
  option(ORDERPOINT_TRIGGER.MANUAL, 'Manual', 'gray'),
];

export const ORDERPOINT_SEQUENCE_CODE = 'stock.orderpoint';
// Name of the rows the replenishment screen makes.
export const REPLENISHMENT_REPORT_NAME = 'Replenishment Report';
// Twenty runs no code when a list opens: the Replenishment command refreshes
// the suggestions and then opens the list. Were that not possible, the daily
// job would refresh them instead.
export const REPLENISHMENT_REFRESH_IN_DAILY_JOB = false;
