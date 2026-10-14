import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { type OrderFieldInfo } from 'src/fieldservice-stage-validation/types/order-field-info.type';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

// The service order's metadata id and fields at this moment, so a field staff added is known. Read with the app role.
export const readOrderObject = async (): Promise<{ objectId: string; fields: OrderFieldInfo[] }> => {
  const data = requireData(
    await twentyMetadata<{
      objects: { edges: { node: { id: string; universalIdentifier: string; fieldsList: OrderFieldInfo[] } }[] };
    }>(
      'application',
      `{ objects(paging: { first: 1000 }) { edges { node {
        id universalIdentifier fieldsList { name label type isActive settings }
      } } } }`,
    ),
    'Read the service order fields',
  );
  const order = data.objects.edges.find((edge) => edge.node.universalIdentifier === FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER)?.node;

  if (order === undefined) {
    throw new Error('The service order object was not found.');
  }
  return { objectId: order.id, fields: order.fieldsList };
};
