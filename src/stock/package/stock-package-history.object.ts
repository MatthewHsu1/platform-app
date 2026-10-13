import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { appTextField, appWritten, manyToOneField, oneToManyField, printoutsField } from 'src/shared/fields';
import {
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_PACKAGE_HISTORY_FIELD_UNIVERSAL_IDENTIFIERS as HISTORY_FIELD_IDS,
  STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_FIELD_UNIVERSAL_IDENTIFIERS as LINK_FIELD_IDS,
  STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PACKAGE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as RELATION_IDS,
  STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

// A frozen copy of the package tree made at Validate, so a done transfer
// shows package names as they were. Only the app writes it.
export default defineObject({
  universalIdentifier: STOCK_PACKAGE_HISTORY_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockPackageHistory',
  namePlural: 'stockPackageHistories',
  labelSingular: 'Package History',
  labelPlural: 'Package Histories',
  description: 'Where a package was moved, in which container, by which transfers',
  icon: 'IconHistory',
  labelIdentifierFieldMetadataUniversalIdentifier: HISTORY_FIELD_IDS.packageName,
  fields: [
    appTextField(HISTORY_FIELD_IDS.packageName, 'packageName', 'Package Name', 'IconPackage'),
    appWritten(
      manyToOneField({
        universalIdentifier: HISTORY_FIELD_IDS.package,
        name: 'package',
        label: 'Package',
        icon: 'IconPackage',
        onDelete: OnDeleteAction.CASCADE,
        targetObjectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: FIELD_IDS.packageHistories,
      }),
    ),
    appWritten(
      manyToOneField({
        universalIdentifier: HISTORY_FIELD_IDS.location,
        name: 'location',
        label: 'Origin Location',
        icon: 'IconMapPin',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: RELATION_IDS.stockLocationPackageHistories,
      }),
    ),
    appWritten(
      manyToOneField({
        universalIdentifier: HISTORY_FIELD_IDS.locationDest,
        name: 'locationDest',
        label: 'Destination Location',
        icon: 'IconMapPin',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: RELATION_IDS.stockLocationPackageHistoriesDest,
      }),
    ),
    appWritten(
      manyToOneField({
        universalIdentifier: HISTORY_FIELD_IDS.parentOrig,
        name: 'parentOrig',
        label: 'Origin Container',
        icon: 'IconPackages',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: FIELD_IDS.originContainerHistories,
      }),
    ),
    appTextField(HISTORY_FIELD_IDS.parentOrigName, 'parentOrigName', 'Origin Container Name', 'IconPackages'),
    appWritten(
      manyToOneField({
        universalIdentifier: HISTORY_FIELD_IDS.parentDest,
        name: 'parentDest',
        label: 'Destination Container',
        icon: 'IconPackageExport',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: FIELD_IDS.destinationContainerHistories,
      }),
    ),
    appTextField(HISTORY_FIELD_IDS.parentDestName, 'parentDestName', 'Destination Container Name', 'IconPackageExport'),
    appWritten(
      manyToOneField({
        universalIdentifier: HISTORY_FIELD_IDS.outermostDest,
        name: 'outermostDest',
        label: 'Outermost Destination Container',
        icon: 'IconPackages',
        onDelete: OnDeleteAction.SET_NULL,
        targetObjectUniversalIdentifier: STOCK_PACKAGE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: FIELD_IDS.outermostDestinationHistories,
      }),
    ),
    appWritten(
      oneToManyField({
        universalIdentifier: HISTORY_FIELD_IDS.pickings,
        name: 'pickings',
        label: 'Transfers',
        icon: 'IconTruckDelivery',
        targetObjectUniversalIdentifier: STOCK_PACKAGE_HISTORY_STOCK_PICKING_REL_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: LINK_FIELD_IDS.stockPackageHistory,
        junctionTargetFieldUniversalIdentifier: LINK_FIELD_IDS.stockPicking,
      }),
    ),
    printoutsField(HISTORY_FIELD_IDS.printouts),
    oneToManyField({
      universalIdentifier: HISTORY_FIELD_IDS.moveLines,
      name: 'moveLines',
      label: 'Move Lines',
      icon: 'IconListDetails',
      targetObjectUniversalIdentifier: STOCK_MOVE_LINE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: RELATION_IDS.stockMoveLinePackageHistory,
    }),
  ],
});
