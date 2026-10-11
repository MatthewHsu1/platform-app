import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  ANNUAL_INVENTORY_DAY_VARIABLE_UNIVERSAL_IDENTIFIER,
  ANNUAL_INVENTORY_MONTH_VARIABLE_UNIVERSAL_IDENTIFIER,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  PRODUCT_UNIT_DIGITS_VARIABLE_UNIVERSAL_IDENTIFIER,
  ROW_ACCESS_CONFIG_VARIABLE_UNIVERSAL_IDENTIFIER,
  SHOW_EXPECTED_QUANTITY_COUNT_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { EMPTY_ROW_ACCESS_CONFIG } from 'src/row-access/constants/empty-row-access-config.constant';
import { ROW_ACCESS_CONFIG_VARIABLE_KEY } from 'src/row-access/constants/row-access-config-variable-key.constant';
import { REPLENISHMENT_HORIZON_DAYS_VARIABLE_UNIVERSAL_IDENTIFIER } from 'src/stock/routing-universal-identifiers.constant';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  logo: 'public/logo.svg',
  applicationVariables: {
    [ROW_ACCESS_CONFIG_VARIABLE_KEY]: {
      universalIdentifier: ROW_ACCESS_CONFIG_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Row access rules',
      description:
        'Edited on the Settings tab. Object, owner field and role ids are per workspace.',
      type: FieldType.RAW_JSON,
      value: JSON.stringify(EMPTY_ROW_ACCESS_CONFIG),
      isSecret: false,
    },
    PRODUCT_UNIT_DIGITS: {
      universalIdentifier: PRODUCT_UNIT_DIGITS_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Unit rounding (decimals)',
      description:
        'Decimals kept when quantities change unit.',
      type: FieldType.NUMBER,
      value: 2,
      isSecret: false,
    },
    ANNUAL_INVENTORY_MONTH: {
      universalIdentifier: ANNUAL_INVENTORY_MONTH_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Yearly count month',
      description: 'Month of the yearly physical count, 1 to 12. 0 means no yearly count.',
      type: FieldType.NUMBER,
      value: 12,
      isSecret: false,
    },
    ANNUAL_INVENTORY_DAY: {
      universalIdentifier: ANNUAL_INVENTORY_DAY_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Yearly count day',
      description: 'Day of the month of the yearly physical count. A day past the end of the month means its last day.',
      type: FieldType.NUMBER,
      value: 31,
      isSecret: false,
    },
    SHOW_EXPECTED_QUANTITY_COUNT: {
      universalIdentifier: SHOW_EXPECTED_QUANTITY_COUNT_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Show expected quantity on count sheets',
      description: 'Prints the quantity on hand on inventory count sheets. Off: the column stays blank for the counted number.',
      type: FieldType.BOOLEAN,
      value: false,
      isSecret: false,
    },
    REPLENISHMENT_HORIZON_DAYS: {
      universalIdentifier: REPLENISHMENT_HORIZON_DAYS_VARIABLE_UNIVERSAL_IDENTIFIER,
      label: 'Replenishment horizon (days)',
      description: 'How many days ahead reordering counts what comes in and goes out.',
      type: FieldType.NUMBER,
      value: 365,
      isSecret: false,
    },
  },
});
