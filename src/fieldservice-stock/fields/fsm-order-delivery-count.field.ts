import { defineField } from 'twenty-sdk/define';

import { FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS } from 'src/fieldservice-stock/fieldservice-stock-universal-identifiers.constant';
import { FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/fieldservice/fieldservice-universal-identifiers.constant';
import { appWritten, numberField } from 'src/shared/fields';

// Written by the transfer trigger from the order's outgoing transfers.
export default defineField({
  ...appWritten(
    numberField(FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS.fsmOrderDeliveryCount, 'deliveryCount', 'Delivery orders', 'IconTruckDelivery', {
      decimals: 0,
      int: true,
      defaultValue: 0,
    }),
  ),
  objectUniversalIdentifier: FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER,
});
