import { floatRound } from 'src/shared/utils/float-round.util';
import { quantKey } from 'src/stock/quant/quant-key';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { type CountQuantCreatePlan } from 'src/stock/utils/types/count-quant-create-plan.type';
import { type CreatedQuant } from 'src/stock/utils/types/created-quant.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

export const NOT_STORABLE_REASON = 'Quants cannot be created for consumables or services.';
export const VIEW_LOCATION_REASON =
  'You cannot take products from or deliver products to a location of type "view" ({location}).';

// A user makes a stock row only to count. A typed count goes onto the row of that key with today's date and the
// counter as assignee; without a count the row is an empty row of its key.
export const planCountQuantCreate = ({
  created,
  existing,
  isStorable,
  location,
  name,
  creatorMemberId,
  today,
  nextCountDate,
  now,
  digits,
}: {
  created: CreatedQuant;
  existing: { id: string; quantity: number } | null;
  isStorable: boolean;
  location: { usage: LocationUsage; completeName: string | null };
  name: string;
  creatorMemberId: string | null;
  today: string;
  nextCountDate: string | null;
  now: string;
  digits: number;
}): CountQuantCreatePlan => {
  if (!isStorable) {
    return { kind: 'refuse', reason: NOT_STORABLE_REASON, values: {} };
  }
  if (location.usage === LOCATION_USAGE.VIEW) {
    return { kind: 'refuse', reason: VIEW_LOCATION_REASON, values: { location: location.completeName ?? '' } };
  }

  const counted = created.inventoryQuantity;
  const countFields = (onHand: number) =>
    counted === null
      ? {}
      : {
          inventoryQuantitySet: true,
          inventoryDiffQuantity: floatRound(counted - onHand, 10 ** -digits, 'HALF-UP'),
          isOutdated: false,
          inventoryDate: today,
          assignedUserId: created.assignedUserId ?? creatorMemberId,
        };

  if (existing !== null) {
    return {
      kind: 'merge',
      targetId: existing.id,
      data: counted === null ? {} : { inventoryQuantity: counted, ...countFields(existing.quantity) },
      destroyId: created.id,
    };
  }

  return {
    kind: 'keep',
    data: {
      quantKey: quantKey({
        productId: created.productId,
        locationId: created.locationId,
        lotId: created.lotId,
        packageId: created.packageId,
        ownerId: created.ownerId,
      }),
      name,
      quantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      inDate: now,
      version: 0,
      isOutdated: false,
      ...(counted === null
        ? { inventoryQuantitySet: false, inventoryDiffQuantity: 0, inventoryDate: created.inventoryDate ?? nextCountDate }
        : countFields(0)),
    },
  };
};
