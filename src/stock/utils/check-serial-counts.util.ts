import { LOCATION_USAGE, PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { isLocationUnder } from 'src/stock/utils/location-usage.util';
import { lotKey } from 'src/stock/utils/plan-lots-at-validate.util';
import { compareAtDigits } from 'src/stock/utils/stock-uom.util';
import { type SerialCheckInput } from 'src/stock/utils/types/serial-check-input.type';
import { type TrackingRefusal } from 'src/stock/utils/types/tracking-refusal.type';

export const DUPLICATE_LOT_MESSAGE =
  'The combination of lot/serial number and product must be unique within a company including when no company is defined.\nThe following combinations contain duplicates:\n{lines}';
export const SERIAL_ASSIGNED_MESSAGE = 'The serial number has already been assigned: \n Product: {product}, Serial Number: {serial}';

export const checkNewLotNames = ({ lines, lotPlan }: Pick<SerialCheckInput, 'lines' | 'lotPlan'>): TrackingRefusal | null => {
  const productNameById = new Map(lines.map((line) => [line.productId, line.productName]));
  const createCounts = new Map<string, { productId: string; name: string; count: number }>();

  for (const lot of lotPlan.create) {
    const key = lotKey(lot.productId, lot.name);
    const entry = createCounts.get(key) ?? { productId: lot.productId, name: lot.name, count: 0 };

    entry.count += 1;
    createCounts.set(key, entry);
  }
  const duplicates = [...createCounts.values()].filter((entry) => entry.count > 1);

  return duplicates.length === 0
    ? null
    : {
        message: DUPLICATE_LOT_MESSAGE,
        values: {
          lines: duplicates
            .map((entry) => ` - Product: ${productNameById.get(entry.productId) ?? ''}, Lot/Serial Number: ${entry.name}`)
            .join('\n'),
        },
      };
};

export const checkSerialAssigned = ({
  lines,
  lotPlan,
  lotNameById,
  quants,
  locations,
  digits,
}: SerialCheckInput): TrackingRefusal | null => {
  const productNameById = new Map(lines.map((line) => [line.productId, line.productName]));
  const assignedLotByLine = new Map(lotPlan.assign.map((entry) => [entry.lineId, entry.lotId]));
  const newLotByLine = new Map(lotPlan.create.flatMap((lot) => lot.lineIds.map((lineId) => [lineId, lot.name] as const)));
  const destinations = [...new Set(lines.map((line) => line.moveLocationDestId))].map((id) => locations.get(id)?.parentPath ?? null);
  const isChecked = (locationId: string) => {
    const location = locations.get(locationId);

    return (
      location !== undefined &&
      location.usage !== LOCATION_USAGE.INVENTORY &&
      destinations.some((destination) => isLocationUnder(location.parentPath, destination))
    );
  };
  const projected = new Map<string, { productId: string; serial: string; quantity: number }>();
  const add = (productId: string, locationId: string, identity: string, serial: string, delta: number) => {
    if (!isChecked(locationId)) {
      return;
    }
    const key = `${productId}|${locationId}|${identity}`;
    const entry = projected.get(key) ?? { productId, serial, quantity: 0 };

    entry.quantity += delta;
    projected.set(key, entry);
  };
  const serialLines = lines.filter((line) => line.tracking === PRODUCT_TRACKING.SERIAL);
  const serialLotIds = new Set<string>();

  for (const line of serialLines) {
    const lotId = line.lotId ?? assignedLotByLine.get(line.id) ?? null;
    const newName = newLotByLine.get(line.id);
    const identity = lotId ?? (newName === undefined ? null : `new:${newName}`);

    if (identity === null) {
      continue;
    }
    if (lotId !== null) {
      serialLotIds.add(lotId);
    }
    const serial = lotId === null ? (newName ?? '') : (lotNameById.get(lotId) ?? '');

    add(line.productId, line.locationId, identity, serial, -line.quantityProductUom);
    add(line.productId, line.locationDestId, identity, serial, line.quantityProductUom);
  }
  for (const quant of quants) {
    if (serialLotIds.has(quant.lotId) && productNameById.has(quant.productId)) {
      add(quant.productId, quant.locationId, quant.lotId, lotNameById.get(quant.lotId) ?? '', quant.quantity);
    }
  }

  const offending = [...projected.values()].find((entry) => compareAtDigits(Math.abs(entry.quantity), 1, digits) > 0);

  return offending === undefined
    ? null
    : { message: SERIAL_ASSIGNED_MESSAGE, values: { product: productNameById.get(offending.productId) ?? '', serial: offending.serial } };
};

// Both refusals would come after the stock moved and undo the whole validation. With nothing to undo here,
// they are checked on the projected stock before anything is written: two new lots with one name, then a
// serial number counted more than once in a location at or under where the stock goes (counts and scrap
// locations excluded).
export const checkSerialCounts = (input: SerialCheckInput): TrackingRefusal | null =>
  checkNewLotNames(input) ?? checkSerialAssigned(input);
