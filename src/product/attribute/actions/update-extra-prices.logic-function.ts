import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import {
  UPDATE_EXTRA_PRICES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  UPDATE_EXTRA_PRICES_ROUTE_PATH,
} from 'src/product/attribute/actions/attribute-actions-universal-identifiers.constant';
import {
  findAttributeValue,
  inChunks,
  listAsPerson,
  readAttributeValueId,
} from 'src/product/attribute/actions/attribute-value-action-route';
import { jsonResponse } from 'src/shared/route-response';
import { type Currency } from 'src/product/variant/template-state.type';
import { DEFAULT_CURRENCY_CODE } from 'src/shared/currency.constant';
import { describeGraphqlErrors, twentyGraphql } from 'src/shared/twenty-graphql';
import { sameValue } from 'src/shared/utils/same-value.util';

// Every product attribute value of the value takes
// the value's default extra price.
const handler = async (payload: RoutePayload) => {
  const attributeValueId = readAttributeValueId(payload);

  if (attributeValueId === null) {
    return jsonResponse(400, { error: 'attributeValueId is required.' });
  }
  const value = await findAttributeValue<{ id: string; defaultExtraPrice: Currency | null }>(
    attributeValueId,
    'id defaultExtraPrice { amountMicros currencyCode }',
  );

  if (value === null) {
    return jsonResponse(404, { error: 'Attribute value not found.' });
  }
  const price = {
    amountMicros: value.defaultExtraPrice?.amountMicros ?? 0,
    currencyCode: value.defaultExtraPrice?.currencyCode ?? DEFAULT_CURRENCY_CODE,
  };
  const templateValues = await listAsPerson<{ id: string; priceExtra: Currency | null }>({
    singular: 'ProductTemplateAttributeValue',
    plural: 'productTemplateAttributeValues',
    filter: { productAttributeValueId: { eq: attributeValueId } },
    selection: 'id priceExtra { amountMicros currencyCode }',
  });
  const stale = templateValues.filter((row) => !sameValue(row.priceExtra, price));

  for (const part of inChunks(stale)) {
    const updated = await twentyGraphql<{ updateProductTemplateAttributeValues: { id: string }[] }>(
      'person',
      `mutation UpdateExtraPrices($filter: ProductTemplateAttributeValueFilterInput!, $data: ProductTemplateAttributeValueUpdateInput!) {
        updateProductTemplateAttributeValues(filter: $filter, data: $data) { id }
      }`,
      { filter: { id: { in: part.map((row) => row.id) } }, data: { priceExtra: price } },
    );

    if (!updated.data?.updateProductTemplateAttributeValues) {
      return jsonResponse(500, {
        error: `Could not update the prices: ${describeGraphqlErrors(updated.errors)}`,
      });
    }
  }

  return jsonResponse(200, { updated: templateValues.length });
};

export default defineLogicFunction({
  universalIdentifier: UPDATE_EXTRA_PRICES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'update-attribute-value-extra-prices',
  description: "Sets the extra price of every product attribute value of an attribute value to its default extra price.",
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: {
    path: UPDATE_EXTRA_PRICES_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
