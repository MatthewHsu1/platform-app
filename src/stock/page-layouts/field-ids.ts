import { PRODUCT_EXPIRY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as EXPIRY } from 'src/product-expiry/product-expiry-universal-identifiers.constant';
import {
  STOCK_PICKING_BATCH_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as BATCH,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as ROUTING } from 'src/stock/routing-universal-identifiers.constant';
import {
  STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as CORE,
  STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_LOT_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_LOT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as LOT,
  STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_MOVE_LINE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as PACKAGE,
  STOCK_PICKING_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_PICKING_TYPE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_QUANT_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_TRACKING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as TRACKING,
  STOCK_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_WAREHOUSE_ORDERPOINT_FIELD_UNIVERSAL_IDENTIFIERS,
  STOCK_WAREHOUSE_ORDERPOINT_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as ORDERPOINT,
} from 'src/stock/stock-universal-identifiers.constant';

type FieldMap<TKey extends string> = Record<TKey, string>;

// Field ids by the field's name on the object. Fields added to an object from
// another module with defineField come from that module's
// `*_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS` map (keyed `<target><FieldName>`).
export const PICKING_FIELDS = {
  ...STOCK_PICKING_FIELD_UNIVERSAL_IDENTIFIERS,
  batch: BATCH.pickingBatch,
  shippingWeight: PACKAGE.stockPickingShippingWeight,
  packageHistories: PACKAGE.stockPickingPackageHistories,
} satisfies FieldMap<
  | 'name' | 'state' | 'company' | 'person' | 'pickingType' | 'pickingTypeCode' | 'location' | 'locationDest'
  | 'scheduledDate' | 'dateDeadline' | 'dateDone' | 'origin' | 'priority' | 'owner' | 'responsibleUser'
  | 'backorder' | 'returnPicking' | 'batch' | 'moves' | 'moveLines' | 'moveType' | 'printed' | 'isLocked'
  | 'shippingWeight' | 'note' | 'packageHistories' | 'signature' | 'printouts' | 'hasDeadlineIssue' | 'returns'
>;

export const MOVE_FIELDS = {
  ...STOCK_MOVE_FIELD_UNIVERSAL_IDENTIFIERS,
  rule: ROUTING.stockMoveRule,
} satisfies FieldMap<
  | 'reference' | 'product' | 'productUomQty' | 'quantity' | 'productUom' | 'state' | 'picked' | 'location'
  | 'locationDest' | 'locationFinal' | 'date' | 'dateDeadline' | 'pickingType' | 'picking' | 'restrictPartner'
  | 'procureMethod' | 'rule' | 'moveLines' | 'moveOrigs' | 'moveDests'
>;

export const MOVE_LINE_FIELDS = {
  ...STOCK_MOVE_LINE_FIELD_UNIVERSAL_IDENTIFIERS,
  lot: LOT.stockMoveLineLot,
  package: PACKAGE.stockMoveLinePackage,
  resultPackage: PACKAGE.stockMoveLineResultPackage,
} satisfies FieldMap<
  'product' | 'quantity' | 'productUom' | 'state' | 'date' | 'location' | 'locationDest' | 'lot' | 'package' | 'resultPackage' | 'picking' | 'owner'
>;

export const QUANT_FIELDS = {
  ...STOCK_QUANT_FIELD_UNIVERSAL_IDENTIFIERS,
  lot: LOT.stockQuantLot,
  package: PACKAGE.stockQuantPackage,
} satisfies FieldMap<
  | 'product' | 'location' | 'lot' | 'package' | 'owner' | 'quantity' | 'reservedQuantity' | 'inventoryQuantity'
  | 'inventoryDiffQuantity' | 'inventoryDate' | 'lastCountDate' | 'assignedUser' | 'isOutdated'
>;

export const PRODUCT_TEMPLATE_STOCK_FIELDS = {
  isStorable: CORE.productTemplateIsStorable,
  tracking: TRACKING.templateTracking,
  serialPrefixFormat: TRACKING.templateSerialPrefixFormat,
  responsible: CORE.productTemplateResponsible,
  routes: ROUTING.productTemplateRoutes,
  saleDelay: CORE.productTemplateSaleDelay,
  descriptionPicking: CORE.productTemplateDescriptionPicking,
  descriptionPickingin: CORE.productTemplateDescriptionPickingin,
  descriptionPickingout: CORE.productTemplateDescriptionPickingout,
  propertyStockProduction: CORE.productTemplatePropertyStockProduction,
  propertyStockInventory: CORE.productTemplatePropertyStockInventory,
  useExpirationDate: EXPIRY.templateUseExpirationDate,
  expirationTime: EXPIRY.templateExpirationTime,
  useTime: EXPIRY.templateUseTime,
  removalTime: EXPIRY.templateRemovalTime,
  alertTime: EXPIRY.templateAlertTime,
  qtyAvailable: CORE.productTemplateQtyAvailable,
  virtualAvailable: CORE.productTemplateVirtualAvailable,
  incomingQty: CORE.productTemplateIncomingQty,
  outgoingQty: CORE.productTemplateOutgoingQty,
} satisfies FieldMap<
  | 'isStorable' | 'tracking' | 'serialPrefixFormat' | 'responsible' | 'routes' | 'saleDelay' | 'descriptionPicking'
  | 'descriptionPickingin' | 'descriptionPickingout' | 'propertyStockProduction' | 'propertyStockInventory'
  | 'useExpirationDate' | 'expirationTime' | 'useTime' | 'removalTime' | 'alertTime' | 'qtyAvailable'
  | 'virtualAvailable' | 'incomingQty' | 'outgoingQty'
>;

export const PRODUCT_PRODUCT_STOCK_FIELDS = {
  qtyAvailable: CORE.productProductQtyAvailable,
  freeQty: CORE.productProductFreeQty,
  incomingQty: CORE.productProductIncomingQty,
  outgoingQty: CORE.productProductOutgoingQty,
  virtualAvailable: CORE.productProductVirtualAvailable,
  stockQuants: CORE.productProductStockQuants,
  stockLots: LOT.productProductStockLots,
  orderpoints: ORDERPOINT.productProductOrderpoints,
  putawayRules: ROUTING.productProductPutawayRules,
  storageCapacities: ROUTING.productProductStorageCapacities,
} satisfies FieldMap<
  | 'qtyAvailable' | 'freeQty' | 'incomingQty' | 'outgoingQty' | 'virtualAvailable' | 'stockQuants' | 'stockLots'
  | 'orderpoints' | 'putawayRules' | 'storageCapacities'
>;

export const LOCATION_FIELDS = {
  ...STOCK_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS,
  removalStrategy: ROUTING.stockLocationRemovalStrategy,
  storageCategory: ROUTING.stockLocationStorageCategory,
  putawayRules: ROUTING.stockLocationPutawayRules,
} satisfies FieldMap<
  | 'name' | 'completeName' | 'location' | 'usage' | 'warehouse' | 'removalStrategy' | 'storageCategory'
  | 'cyclicInventoryFrequency' | 'nextInventoryDate' | 'lastInventoryDate' | 'barcode' | 'replenishLocation'
  | 'quants' | 'children' | 'putawayRules' | 'active'
>;

export const WAREHOUSE_FIELDS = {
  ...STOCK_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS,
  resupplyWhs: ROUTING.stockWarehouseResupplyWhs,
  routes: ROUTING.stockWarehouseRoutes,
  resupplyRoutes: ROUTING.stockWarehouseResupplyRoutes,
  receptionRoute: ROUTING.stockWarehouseReceptionRoute,
  deliveryRoute: ROUTING.stockWarehouseDeliveryRoute,
  mtoPull: ROUTING.stockWarehouseMtoPull,
} satisfies FieldMap<
  | 'name' | 'code' | 'partner' | 'receptionSteps' | 'deliverySteps' | 'resupplyWhs' | 'viewLocation' | 'lotStock'
  | 'whInputStockLoc' | 'whQcStockLoc' | 'whOutputStockLoc' | 'whPackStockLoc' | 'inType' | 'outType' | 'intType'
  | 'pickType' | 'packType' | 'qcType' | 'storeType' | 'xdockType' | 'routes' | 'resupplyRoutes' | 'receptionRoute'
  | 'deliveryRoute' | 'mtoPull'
>;

export const PICKING_TYPE_FIELDS = {
  ...STOCK_PICKING_TYPE_FIELD_UNIVERSAL_IDENTIFIERS,
  autoBatch: BATCH.autoBatch,
  batchGroupByPartner: BATCH.batchGroupByPartner,
  batchGroupByDestination: BATCH.batchGroupByDestination,
  batchGroupBySrcLoc: BATCH.batchGroupBySrcLoc,
  batchGroupByDestLoc: BATCH.batchGroupByDestLoc,
  waveGroupByProduct: BATCH.waveGroupByProduct,
  waveGroupByCategory: BATCH.waveGroupByCategory,
  waveCategories: BATCH.waveCategories,
  waveGroupByLocation: BATCH.waveGroupByLocation,
  waveLocations: BATCH.waveLocations,
  batchMaxLines: BATCH.batchMaxLines,
  batchMaxPickings: BATCH.batchMaxPickings,
  batchAutoConfirm: BATCH.batchAutoConfirm,
} satisfies FieldMap<
  | 'name' | 'code' | 'sequenceCode' | 'warehouse' | 'defaultLocationSrc' | 'defaultLocationDest' | 'reservationMethod'
  | 'reservationDaysBefore' | 'reservationDaysBeforePriority' | 'createBackorder' | 'moveType' | 'useCreateLots'
  | 'useExistingLots' | 'showEntirePacks' | 'setPackageType' | 'returnPickingType' | 'printLabel'
  | 'autoShowReceptionReport' | 'autoPrintDeliverySlip' | 'autoPrintReturnSlip' | 'autoPrintProductLabels'
  | 'productLabelFormat' | 'autoPrintLotLabels' | 'lotLabelFormat' | 'autoPrintReceptionReport'
  | 'autoPrintReceptionReportLabels' | 'autoPrintPackages' | 'autoPrintPackageLabel' | 'packageLabelToPrint'
  | 'autoBatch' | 'batchGroupByPartner' | 'batchGroupByDestination' | 'batchGroupBySrcLoc' | 'batchGroupByDestLoc'
  | 'waveGroupByProduct' | 'waveGroupByCategory' | 'waveCategories' | 'waveGroupByLocation' | 'waveLocations'
  | 'batchMaxLines' | 'batchMaxPickings' | 'batchAutoConfirm' | 'pickings' | 'sequence' | 'active' | 'barcode'
>;

export const LOT_FIELDS = {
  ...STOCK_LOT_FIELD_UNIVERSAL_IDENTIFIERS,
  expirationDate: EXPIRY.lotExpirationDate,
  useDate: EXPIRY.lotUseDate,
  removalDate: EXPIRY.lotRemovalDate,
  alertDate: EXPIRY.lotAlertDate,
  productExpiryAlert: EXPIRY.lotProductExpiryAlert,
} satisfies FieldMap<
  | 'name' | 'product' | 'ref' | 'location' | 'productQty' | 'expirationDate' | 'useDate' | 'removalDate'
  | 'alertDate' | 'productExpiryAlert' | 'quants' | 'note'
>;

export const PACKAGE_FIELDS = STOCK_PACKAGE_FIELD_UNIVERSAL_IDENTIFIERS satisfies FieldMap<
  | 'name' | 'completeName' | 'packageType' | 'location' | 'parentPackage' | 'packageDest' | 'packDate'
  | 'shippingWeight' | 'childPackages' | 'packageHistories'
>;

export const BATCH_FIELDS = STOCK_PICKING_BATCH_FIELD_UNIVERSAL_IDENTIFIERS satisfies FieldMap<
  'name' | 'description' | 'responsible' | 'pickingType' | 'state' | 'scheduledDate' | 'isWave' | 'pickings'
>;

export const ORDERPOINT_FIELDS = STOCK_WAREHOUSE_ORDERPOINT_FIELD_UNIVERSAL_IDENTIFIERS satisfies FieldMap<
  | 'product' | 'location' | 'warehouse' | 'productMinQty' | 'productMaxQty' | 'replenishmentUom' | 'qtyToOrder'
  | 'trigger' | 'route' | 'snoozedUntil' | 'qtyOnHand' | 'qtyForecast' | 'deadlineDate'
>;
