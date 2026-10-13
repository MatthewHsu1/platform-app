import { defineField } from 'twenty-sdk/define';

import { oneToManyField } from 'src/shared/fields';
import {
  STOCK_LOCATION_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS as LINK_IDS,
  STOCK_LOCATION_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as INVERSE_IDS,
} from 'src/stock-picking-batch/stock-picking-batch-universal-identifiers.constant';
import { STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

export default defineField({
  ...oneToManyField({
    universalIdentifier: INVERSE_IDS.stockLocationWaveLinks,
    name: 'waveLocationLinks',
    label: 'Wave operation types',
    icon: 'IconLink',
    targetObjectUniversalIdentifier: STOCK_LOCATION_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    targetFieldUniversalIdentifier: LINK_IDS.stockLocation,
  }),
  objectUniversalIdentifier: STOCK_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER,
});
