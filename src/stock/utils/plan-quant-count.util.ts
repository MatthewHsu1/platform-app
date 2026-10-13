import { floatRound } from 'src/shared/utils/float-round.util';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

export const QUANT_KEY_EDIT_REASON = "Quant's editing is restricted, you can't do this operation.";

const KEY_FIELDS = ['productId', 'locationId', 'lotId', 'packageId', 'ownerId'] as const;

type QuantKeyFields = {
  productId: string;
  locationId: string;
  lotId: string | null;
  packageId: string | null;
  ownerId: string | null;
};

// A typed count marks the row counted; an emptied count number counts as 0.
export const planCountTyped = ({
  inventoryQuantity,
  quantity,
  digits,
}: {
  inventoryQuantity: number | null;
  quantity: number;
  digits: number;
}) => ({
  inventoryQuantitySet: true,
  inventoryDiffQuantity: floatRound((inventoryQuantity ?? 0) - quantity, 10 ** -digits, 'HALF-UP'),
  isOutdated: false,
});

export const planQuantKeyEdit = ({
  before,
  after,
  beforeLocationUsage,
}: {
  before: QuantKeyFields;
  after: QuantKeyFields;
  beforeLocationUsage: LocationUsage;
}) => {
  const changed = KEY_FIELDS.filter((field) => (before[field] ?? null) !== (after[field] ?? null));

  if (changed.length === 0) {
    return null;
  }

  return {
    data: Object.fromEntries(changed.map((field) => [field, before[field] ?? null])),
    withNote: beforeLocationUsage !== LOCATION_USAGE.INVENTORY,
    reason: QUANT_KEY_EDIT_REASON,
  };
};
