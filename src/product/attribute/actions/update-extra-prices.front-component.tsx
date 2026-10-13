import { defineFrontComponent } from 'twenty-sdk/define';

import { makeAttributeValueActionCommand } from 'src/product/attribute/actions/attribute-value-action-command';
import {
  UPDATE_EXTRA_PRICES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  UPDATE_EXTRA_PRICES_ROUTE_PATH,
} from 'src/product/attribute/actions/attribute-actions-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: UPDATE_EXTRA_PRICES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'update-attribute-value-extra-prices',
  description: 'Sets the extra price on every product to the default extra price of the open attribute value.',
  isHeadless: true,
  component: makeAttributeValueActionCommand({
    routePath: UPDATE_EXTRA_PRICES_ROUTE_PATH,
    successMessage: ({ updated = 0 }) => `Updated ${updated} extra prices.`,
    fallbackError: 'Could not update the extra prices.',
  }),
});
