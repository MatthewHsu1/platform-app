import { PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { type ProductLotFields } from 'src/stock/utils/types/product-lot-fields.type';
import { type ProductLotFieldsPlan } from 'src/stock/utils/types/product-lot-fields-plan.type';
import { type SerialSequence } from 'src/stock/utils/types/serial-sequence.type';

const SERIAL_SEQUENCE_CODE = 'stock.lot.serial';
const SERIAL_SEQUENCE_PADDING = 7;

const text = (value: string | null) => value ?? '';

// Tracking follows every save, the app's own too: the product type rule turns
// isStorable off as the app. A prefix only counts when staff typed it; the
// prefix shown otherwise always follows the product's sequence.
export const planProductLotFields = ({
  operation,
  before,
  after,
  productName,
  isStaffChange,
  sequences,
  seedSequence,
}: {
  operation: 'created' | 'updated';
  before: ProductLotFields | null;
  after: ProductLotFields;
  productName: string;
  isStaffChange: boolean;
  sequences: SerialSequence[];
  seedSequence: SerialSequence | null;
}): ProductLotFieldsPlan => {
  const data: ProductLotFieldsPlan['data'] = {};
  const tracking = after.isStorable ? after.tracking : PRODUCT_TRACKING.NONE;

  if (tracking !== after.tracking) {
    data.tracking = tracking;
  }
  const trackingSetToNone =
    data.tracking !== undefined ||
    (before !== null && before.tracking !== after.tracking && after.tracking === PRODUCT_TRACKING.NONE);

  if (after.useExpirationDate && trackingSetToNone) {
    data.useExpirationDate = false;
  }

  const typedPrefix = text(after.serialPrefixFormat);
  const prefixTyped = isStaffChange && typedPrefix !== (before === null ? '' : text(before.serialPrefixFormat));
  let sequenceId = after.lotSequenceId;

  if (prefixTyped) {
    const found = sequences.find((sequence) => text(sequence.prefix) === typedPrefix);

    if (typedPrefix === '') {
      sequenceId = seedSequence?.id ?? null;
    } else if (found !== undefined) {
      sequenceId = found.id;
    } else {
      return {
        data,
        createSequence: {
          name: `${productName} Serial Sequence`,
          code: SERIAL_SEQUENCE_CODE,
          prefix: typedPrefix,
          padding: SERIAL_SEQUENCE_PADDING,
        },
      };
    }
  } else if (operation === 'created' && after.lotSequenceId === null) {
    sequenceId = seedSequence?.id ?? null;
  }

  if (sequenceId !== after.lotSequenceId) {
    data.lotSequenceId = sequenceId;
  }
  const shownPrefix = text(sequences.find((sequence) => sequence.id === sequenceId)?.prefix ?? null);

  if (!prefixTyped && shownPrefix !== typedPrefix) {
    data.serialPrefixFormat = shownPrefix === '' ? null : shownPrefix;
  }

  return { data, createSequence: null };
};
