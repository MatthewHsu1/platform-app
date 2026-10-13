import { defineLogicFunction, type RoutePayload } from 'twenty-sdk/define';

import {
  ADD_TO_ALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  ADD_TO_ALL_ROUTE_PATH,
} from 'src/product/attribute/actions/attribute-actions-universal-identifiers.constant';
import {
  findAttributeValue,
  inChunks,
  listAsPerson,
  readAttributeValueId,
} from 'src/product/attribute/actions/attribute-value-action-route';
import { jsonResponse } from 'src/shared/route-response';
import { describeGraphqlErrors, twentyGraphql } from 'src/shared/twenty-graphql';

// The value joins every active attribute line of
// its attribute that does not offer it yet. The link trigger then adds the
// product attribute values and variants.
const handler = async (payload: RoutePayload) => {
  const attributeValueId = readAttributeValueId(payload);

  if (attributeValueId === null) {
    return jsonResponse(400, { error: 'attributeValueId is required.' });
  }
  const value = await findAttributeValue<{ id: string; attributeId: string | null }>(
    attributeValueId,
    'id attributeId',
  );

  if (value === null || value.attributeId === null) {
    return jsonResponse(404, { error: 'Attribute value not found.' });
  }
  const lines = await listAsPerson<{ id: string }>({
    singular: 'ProductTemplateAttributeLine',
    plural: 'productTemplateAttributeLines',
    filter: { attributeId: { eq: value.attributeId }, active: { eq: true } },
    selection: 'id',
  });
  const links = await listAsPerson<{ productTemplateAttributeLineId: string | null }>({
    singular: 'ProductAttributeValueLineRel',
    plural: 'productAttributeValueLineRels',
    filter: { productAttributeValueId: { eq: attributeValueId } },
    selection: 'productTemplateAttributeLineId',
  });
  const linked = new Set(links.map((link) => link.productTemplateAttributeLineId));
  const missing = lines.filter((line) => !linked.has(line.id));

  for (const part of inChunks(missing)) {
    const created = await twentyGraphql<{ createProductAttributeValueLineRels: { id: string }[] }>(
      'person',
      `mutation AddValueToLines($data: [ProductAttributeValueLineRelCreateInput!]!) {
        createProductAttributeValueLineRels(data: $data) { id }
      }`,
      {
        data: part.map((line) => ({
          productTemplateAttributeLineId: line.id,
          productAttributeValueId: attributeValueId,
        })),
      },
    );

    if (!created.data?.createProductAttributeValueLineRels) {
      return jsonResponse(500, {
        error: `Could not add the value: ${describeGraphqlErrors(created.errors)}`,
      });
    }
  }

  return jsonResponse(200, { addedLines: missing.length });
};

export default defineLogicFunction({
  universalIdentifier: ADD_TO_ALL_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'add-attribute-value-to-all-products',
  description: 'Adds an attribute value to every active attribute line of its attribute.',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: {
    path: ADD_TO_ALL_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
