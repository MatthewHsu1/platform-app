export const LOCATION_ROW =
  'id name completeName active usage locationId parentPath replenishLocation barcode cyclicInventoryFrequency lastInventoryDate nextInventoryDate warehouseId seedKey';

export const WAREHOUSE_ROW =
  'id name active partnerId code receptionSteps deliverySteps viewLocationId lotStockId whInputStockLocId whQcStockLocId whOutputStockLocId whPackStockLocId inTypeId outTypeId intTypeId pickTypeId packTypeId qcTypeId storeTypeId xdockTypeId sequence seedKey createdAt';

export const PICKING_TYPE_ROW =
  'id name sequence referenceSequenceId sequenceCode defaultLocationSrcId defaultLocationDestId code returnPickingTypeId warehouseId active useCreateLots useExistingLots printLabel reservationMethod reservationDaysBefore reservationDaysBeforePriority createBackorder moveType barcode';

export const SEQUENCE_ROW = 'id name code prefix padding numberNext numberIncrement active seedKey';

export const PICKING_ROW =
  'id name origin state priority scheduledDate dateDeadline hasDeadlineIssue delayAlertDate dateDone locationId locationDestId pickingTypeId pickingTypeCode companyId personId responsibleUserId ownerId printed isLocked moveType backorderId returnPickingId createdAt';

export const MOVE_ROW =
  'id name reference sequence priority date dateDeadline productId descriptionPickingManual descriptionPicking productQty productUomQty productUomId locationId locationDestId locationFinalId companyId personId pickingId state picked priceUnit { amountMicros currencyCode } origin procureMethod scrapId propagateCancel delayAlertDate pickingTypeId isInventory inventoryName originReturnedMoveId restrictPartnerId warehouseId quantity additional reservationDate packagingUomId packagingUomQty createdAt';

export const MOVE_LINE_ROW =
  'id name pickingId moveId productId productUomId quantity quantityProductUom picked date ownerId lotId packageId resultPackageId locationId locationDestId state createdAt';

export const QUANT_ROW =
  'id name productId locationId ownerId lotId packageId quantity reservedQuantity availableQuantity inDate quantKey version inventoryQuantity inventoryDiffQuantity inventoryDate inventoryQuantitySet isOutdated lastCountDate assignedUserId';

export const SCRAP_ROW =
  'id name origin productId productUomId ownerId lotId packageId pickingId locationId scrapLocationId scrapQty state dateDone shouldReplenish';

export const MOVE_MOVE_REL_ROW = 'id moveOrigId moveDestId';
