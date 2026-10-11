import { floatRound } from 'src/shared/utils/float-round.util';
import { destinationKeyOf, sourceKeyOf } from 'src/stock/quant/quant-key';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type ResetLine } from 'src/stock/utils/types/reset-line.type';
import { type ResetStep } from 'src/stock/utils/types/reset-step.type';
import { type LocationUsage } from 'src/stock/types/location-usage.type';

const COUNTED_USAGES: LocationUsage[] = [LOCATION_USAGE.INTERNAL, LOCATION_USAGE.TRANSIT];

// Per key: the done history says `ledger`, the row holds `onHand`. The row first takes the part it misses (delta), then
// a count of the old on-hand moves that part to the inventory loss location, so the history of the key ends at what
// was on hand.
export const planResetInventory = ({
  doneLines,
  locationUsages,
  onHand,
  digits,
}: {
  doneLines: ResetLine[];
  locationUsages: Map<string, LocationUsage>;
  onHand: Map<string, number>;
  digits: number;
}): ResetStep[] => {
  const ledger = new Map<string, number>();
  const add = (key: string, quantity: number) => ledger.set(key, (ledger.get(key) ?? 0) + quantity);
  const counted = (locationId: string | null) => {
    const usage = locationId === null ? undefined : locationUsages.get(locationId);

    return usage !== undefined && COUNTED_USAGES.includes(usage);
  };

  for (const line of doneLines) {
    if (counted(line.locationId)) {
      add(sourceKeyOf(line), -line.quantityProductUom);
    }
    if (counted(line.locationDestId)) {
      add(destinationKeyOf(line), line.quantityProductUom);
    }
  }

  return [...ledger.entries()]
    .map(([key, total]) => {
      const held = onHand.get(key) ?? 0;

      return { key, delta: floatRound(total - held, 10 ** -digits, 'HALF-UP'), count: floatRound(held, 10 ** -digits, 'HALF-UP') };
    })
    .filter((step) => !isZeroAtDigits(step.delta, digits))
    .sort((left, right) => left.key.localeCompare(right.key));
};
