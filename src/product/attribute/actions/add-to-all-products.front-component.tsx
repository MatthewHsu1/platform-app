import { defineFrontComponent } from 'twenty-sdk/define';

import { makeAttributeValueActionCommand } from 'src/product/attribute/actions/attribute-value-action-command';
import {
  ADD_TO_ALL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  ADD_TO_ALL_ROUTE_PATH,
} from 'src/product/attribute/actions/attribute-actions-universal-identifiers.constant';

export default defineFrontComponent({
  universalIdentifier: ADD_TO_ALL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'add-attribute-value-to-all-products',
  description: 'Adds the open attribute value to all products that use its attribute.',
  isHeadless: true,
  component: makeAttributeValueActionCommand({
    routePath: ADD_TO_ALL_ROUTE_PATH,
    successMessage: ({ addedLines = 0 }) => `Added to ${addedLines} products.`,
    fallbackError: 'Could not add the value to the products.',
  }),
});
