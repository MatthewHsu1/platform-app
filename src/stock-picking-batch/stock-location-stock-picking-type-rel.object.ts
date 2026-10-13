import { defineObject } from 'twenty-sdk/define';

import {
  STOCK_LOCATION_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_LOCATION_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { linkObjectConfig } from 'src/stock/route/link-definitions';
import {
  STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/stock/stock-universal-identifiers.constant';

export default defineObject(
  linkObjectConfig({
    universalIdentifier: STOCK_LOCATION_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    nameSingular: 'stockLocationStockPickingTypeRel',
    namePlural: 'stockLocationStockPickingTypeRels',
    labelSingular: 'Wave location link',
    labelPlural: 'Wave location links',
    description: 'An internal location an operation type groups waves by',
    sides: [
      {
        universalIdentifier: FIELD_IDS.stockPickingType,
        name: 'stockPickingType',
        label: 'Operation Type',
        icon: 'IconTransfer',
        targetObjectUniversalIdentifier: STOCK_PICKING_TYPE_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: INVERSE_IDS.waveLocations,
      },
      {
        universalIdentifier: FIELD_IDS.stockLocation,
        name: 'stockLocation',
        label: 'Location',
        icon: 'IconMapPin',
        targetObjectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
        targetFieldUniversalIdentifier: INVERSE_IDS.stockLocationWaveLinks,
      },
    ],
  }),
);
