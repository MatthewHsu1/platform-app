import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { productComboItems, productComboLinks, productCombos } from 'src/product/combo/combo-records';
import { PRODUCT_COMBO_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS } from 'src/product/product-universal-identifiers.constant';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';

type ComboEventRecord = { id: string };

// The items and product links of a deleted combo choice go with it.
// A choice that came back meanwhile keeps its rows.
const handler = async (payload: DatabaseEventBatchPayload<ObjectRecordEvent<ComboEventRecord>>) => {
  const { operation, events } = readEvents<ComboEventRecord>(payload);

  if (operation !== 'deleted') {
    return {};
  }
  const deletedIds = events.map((event) => event.recordId);

  if (deletedIds.length === 0) {
    return {};
  }
  const stillDeleted = (
    await productCombos.findIncludingDeleted<{ id: string; deletedAt: string | null }>(
      { id: { in: deletedIds } },
      'id deletedAt',
    )
  )
    .filter((combo) => combo.deletedAt !== null)
    .map((combo) => combo.id);
  if (stillDeleted.length === 0) {
    return {};
  }
  const errors = errorCollector();

  for (const [owner, label] of [
    [productComboItems, 'items'],
    [productComboLinks, 'links'],
  ] as const) {
    await errors.run(label, async () => {
      const rows = await owner.find<{ id: string }>(
        owner === productComboItems
          ? { comboId: { in: stillDeleted } }
          : { productComboId: { in: stillDeleted } },
        'id',
      );
      await owner.softDeleteMany(rows.map((row) => row.id));
    });
  }
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_COMBO_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS.productCombo,
  name: 'platform-product-combo',
  description: 'Deletes the options and product links of a combo choice that is deleted.',
  timeoutSeconds: 60,
  handler,
  databaseEventTriggerSettings: { eventName: 'productCombo.*', batchMode: true },
});
