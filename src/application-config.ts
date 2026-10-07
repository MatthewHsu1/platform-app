import { defineApplication, FieldType } from 'twenty-sdk/define';

import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
  ROW_ACCESS_CONFIG_VARIABLE_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';
import { EMPTY_ROW_ACCESS_CONFIG } from 'src/row-access/constants/empty-row-access-config.constant';
import { ROW_ACCESS_CONFIG_VARIABLE_KEY } from 'src/row-access/constants/row-access-config-variable-key.constant';

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
  },
});
