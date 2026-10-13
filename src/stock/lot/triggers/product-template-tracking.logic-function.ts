import {
  type DatabaseEventBatchPayload,
  defineLogicFunction,
  type ObjectRecordEvent,
} from 'twenty-sdk/define';

import { createMissingRows } from 'src/shared/claims/create-missing-rows';
import { isStaffChange } from 'src/shared/triggers/actor';
import { readEvents } from 'src/shared/triggers/batch-events';
import { errorCollector } from 'src/shared/triggers/retry-on-conflict';
import { derivedId } from 'src/shared/utils/derived-id.util';
import { eventAfter, eventBefore, eventChangedFields } from 'src/stock/stock-event-helpers';
import { PRODUCT_TRACKING, STOCK_SEED_KEYS } from 'src/stock/stock-options.constant';
import { irSequences, productTemplates } from 'src/stock/stock-records';
import { PRODUCT_TEMPLATE_TRACKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';
import { type ActorRow } from 'src/stock/types/actor-row.type';
import { type ProductTracking } from 'src/stock/types/product-tracking.type';
import { planProductLotFields } from 'src/stock/utils/plan-product-lot-fields.util';
import { type ProductLotFields } from 'src/stock/utils/types/product-lot-fields.type';
import { type SerialSequence } from 'src/stock/utils/types/serial-sequence.type';

type TemplateRecord = ActorRow & {
  id: string;
  name: string | null;
  isStorable: boolean | null;
  tracking: string | null;
  useExpirationDate: boolean | null;
  lotSequenceId: string | null;
  serialPrefixFormat: string | null;
  updatedAt?: string;
};

type TemplateEvent = ObjectRecordEvent<TemplateRecord>;

const WATCHED_FIELDS: (keyof TemplateRecord & string)[] = ['isStorable', 'tracking', 'lotSequenceId', 'serialPrefixFormat'];
const SELECTION = 'id name isStorable tracking useExpirationDate lotSequenceId serialPrefixFormat';

const asFields = (record: TemplateRecord): ProductLotFields => ({
  isStorable: record.isStorable === true,
  tracking: (record.tracking ?? PRODUCT_TRACKING.NONE) as ProductTracking,
  useExpirationDate: record.useExpirationDate === true,
  lotSequenceId: record.lotSequenceId ?? null,
  serialPrefixFormat: record.serialPrefixFormat ?? null,
});

// One plan per product: the state before the batch's first event and who made the changes.
const productChanges = (operation: 'created' | 'updated', events: TemplateEvent[]) => {
  const byProduct = new Map<string, { before: TemplateRecord | null; last: TemplateEvent; isStaffChange: boolean }>();

  for (const event of events) {
    const known = byProduct.get(event.recordId);
    const staff = isStaffChange(operation, event, eventAfter(event));

    byProduct.set(event.recordId, {
      before: known === undefined ? (eventBefore(event) ?? null) : known.before,
      last: event,
      isStaffChange: staff || (known?.isStaffChange ?? false),
    });
  }
  return byProduct;
};

const readSequences = async (stored: TemplateRecord[]) => {
  const known = await irSequences.find<SerialSequence & { seedKey: string | null }>(
    {
      or: [
        { seedKey: { eq: STOCK_SEED_KEYS.lotSequence } },
        { id: { in: stored.flatMap((row) => row.lotSequenceId ?? []) } },
        { prefix: { in: stored.flatMap((row) => row.serialPrefixFormat ?? []) } },
      ],
    },
    'id prefix seedKey',
  );

  return {
    known: known.map(({ id, prefix }): SerialSequence => ({ id, prefix })),
    seedSequence: known.find((sequence) => sequence.seedKey === STOCK_SEED_KEYS.lotSequence) ?? null,
  };
};

const handler = async (payload: DatabaseEventBatchPayload<TemplateEvent>) => {
  const { operation, events } = readEvents<TemplateRecord>(payload);

  if (operation !== 'created' && operation !== 'updated') {
    return {};
  }
  const relevant =
    operation === 'created' ? events : events.filter((event) => eventChangedFields(event, WATCHED_FIELDS).length > 0);

  if (relevant.length === 0) {
    return {};
  }
  const changes = productChanges(operation, relevant);
  const stored = await productTemplates.find<TemplateRecord>({ id: { in: [...changes.keys()] } }, SELECTION);
  const { known, seedSequence } = await readSequences(stored);
  const errors = errorCollector();

  for (const row of stored) {
    const change = changes.get(row.id);

    if (change === undefined) {
      continue;
    }
    await errors.run(row.id, async () => {
      const plan = planProductLotFields({
        operation,
        before: change.before === null ? null : asFields(change.before),
        after: asFields(row),
        productName: row.name ?? '',
        isStaffChange: change.isStaffChange,
        sequences: known,
        seedSequence,
      });
      const data: Record<string, unknown> = { ...plan.data };

      if (plan.createSequence !== null) {
        // The id comes from the save that typed the prefix, so a rerun of
        // that save finds the sequence it made instead of making another.
        const savedAt = eventAfter(change.last)?.updatedAt;

        if (savedAt === undefined) {
          throw new Error(`The save event of product ${row.id} carries no update time.`);
        }
        const sequenceId = derivedId('lotSequence', row.id, plan.createSequence.prefix, savedAt);

        await createMissingRows(irSequences, [
          { id: sequenceId, data: { ...plan.createSequence, numberNext: 1, numberIncrement: 1, active: true } },
        ]);
        known.push({ id: sequenceId, prefix: plan.createSequence.prefix });
        data.lotSequenceId = sequenceId;
      }
      await productTemplates.update(row.id, data);
    });
  }
  errors.throwIfAny();
  return {};
};

export default defineLogicFunction({
  universalIdentifier: PRODUCT_TEMPLATE_TRACKING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'platform-product-template-tracking',
  description:
    'Keeps tracking off for products without stock, turns expiry dates off with tracking, gives new products the serial number sequence, and picks or makes the lot sequence from a typed prefix.',
  timeoutSeconds: 120,
  handler,
  databaseEventTriggerSettings: { eventName: 'productTemplate.*', batchMode: true },
});
