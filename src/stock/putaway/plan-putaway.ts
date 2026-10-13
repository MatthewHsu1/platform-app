import { type PutawayInput } from 'src/stock/putaway/types/putaway-input.type';
import { type PutawayLine } from 'src/stock/putaway/types/putaway-line.type';
import { type PutawayLocation } from 'src/stock/putaway/types/putaway-location.type';
import { type PutawayQuant } from 'src/stock/putaway/types/putaway-quant.type';

const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

// The location and its active internal locations below, by full name.
export const childInternalLocations = (locationId: string, locations: Map<string, PutawayLocation>) => {
  const parent = locations.get(locationId);

  if (parent === undefined) {
    return [];
  }
  return [...locations.values()]
    .filter((location) => location.active && location.usage === 'INTERNAL' && location.parentPath.startsWith(parent.parentPath))
    .sort((left, right) => compareText(left.completeName, right.completeName) || compareText(left.id, right.id));
};

const hasTypedPackage = (input: PutawayInput) => input.package !== null && input.package.packageTypeId !== null;

const weightOf = (productId: string, quantity: number, input: PutawayInput) => (input.productWeights.get(productId) ?? 0) * quantity;

const countedLines = (input: PutawayInput) => input.openLines.filter((line) => !line.isDraft && !input.excludedLineIds.has(line.id));

// What is in the location, plus what is on its way in, less what is on its way out.
const forecastWeight = (locationId: string, input: PutawayInput) => {
  const lines = countedLines(input);
  const sumOf = (rows: { productId: string; quantity: number }[]) => rows.reduce((sum, row) => sum + weightOf(row.productId, row.quantity, input), 0);
  const asRows = (rows: PutawayLine[]) => rows.map((line) => ({ productId: line.productId, quantity: line.quantityProductUom }));

  return (
    sumOf(input.quants.filter((quant) => quant.locationId === locationId)) +
    sumOf(asRows(lines.filter((line) => line.locationDestId === locationId))) -
    sumOf(asRows(lines.filter((line) => line.locationId === locationId)))
  );
};

// Whether the product (or the package) may go into the location, given its
// storage category. A location with no storage category takes anything.
// `locationQuantity` is what the location holds and has on its way: packages
// of the type for a package, else the product's quantity.
export const canBeUsed = (location: PutawayLocation, quantity: number, locationQuantity: number, input: PutawayInput): boolean => {
  const category = location.storageCategoryId === null ? undefined : input.storageCategories.get(location.storageCategoryId);

  if (category === undefined) {
    return true;
  }
  const positiveQuants = input.quants.filter((quant) => quant.locationId === location.id && quant.quantity > 0);

  if (category.allowNewProduct === 'EMPTY' && positiveQuants.length > 0) {
    return false;
  }
  if (category.allowNewProduct === 'SAME') {
    // A package brings all its products; anything else brings one.
    const putProductIds = [...new Set(hasTypedPackage(input) ? input.productIds : [input.productId])];
    const [putProductId] = putProductIds;

    if (
      putProductIds.length > 1 ||
      positiveQuants.some((quant) => quant.productId !== putProductId) ||
      input.openLines.some((line) => line.locationDestId === location.id && line.productId !== putProductId)
    ) {
      return false;
    }
  }
  const weight = forecastWeight(location.id, input);

  if (input.package !== null && input.package.packageTypeId !== null) {
    const packageId = input.package.id;
    const packageWeight = input.openLines
      .filter((line) => line.resultPackageId === packageId)
      .reduce((sum, line) => sum + weightOf(line.productId, line.quantityProductUom, input), 0);

    if (category.maxWeight < weight + packageWeight) {
      return false;
    }
    const capacity = category.packageTypeCapacities.get(input.package.packageTypeId);

    return !(capacity !== undefined && locationQuantity >= capacity);
  }
  if (category.maxWeight < weight + weightOf(input.productId, quantity, input)) {
    return false;
  }
  const capacity = category.productCapacities.get(input.productId);

  return !(capacity !== undefined && (locationQuantity >= capacity || quantity + locationQuantity > capacity));
};

// Per candidate location: packages of the type (for a package) or the
// product's quantity, in stock and on its way in. Counted only when a
// candidate has a storage category, since only capacities read it.
const quantityByLocation = (candidates: PutawayLocation[], packageTypeId: string | null, input: PutawayInput) => {
  const quantities = new Map<string, number>();
  const add = (locationId: string, amount: number) => quantities.set(locationId, (quantities.get(locationId) ?? 0) + amount);
  const candidateIds = new Set(candidates.map((location) => location.id));

  if (candidates.some((location) => location.storageCategoryId !== null)) {
    const lines = countedLines(input);

    if (hasTypedPackage(input)) {
      const packagesAt = new Map<string, Set<string>>();
      const addPackage = (locationId: string, packageId: string) => packagesAt.set(locationId, (packagesAt.get(locationId) ?? new Set()).add(packageId));

      for (const line of lines) {
        if (line.resultPackageTypeId === packageTypeId && line.resultPackageId !== null) {
          addPackage(line.locationDestId, line.resultPackageId);
        }
      }
      packagesAt.forEach((packages, locationId) => add(locationId, packages.size));
      packagesAt.clear();
      for (const quant of input.quants) {
        if (quant.packageTypeId === packageTypeId && quant.packageId !== null && candidateIds.has(quant.locationId)) {
          addPackage(quant.locationId, quant.packageId);
        }
      }
      packagesAt.forEach((packages, locationId) => add(locationId, packages.size));
    } else {
      input.quants
        .filter((quant) => quant.productId === input.productId && candidateIds.has(quant.locationId))
        .forEach((quant) => add(quant.locationId, quant.quantity));
      lines
        .filter((line) => line.productId === input.productId && candidateIds.has(line.locationDestId))
        .forEach((line) => add(line.locationDestId, line.quantityProductUom));
    }
  }
  input.extraQuantities.forEach((amount, locationId) => add(locationId, amount));

  return quantities;
};

// Where a product arriving in the destination is stored. The most specific
// rule is tried first (package type, product, own category, any category); no
// rule that fits leaves it in the destination, or in the destination's first
// internal location when the destination is a view.
export const planPutaway = (input: PutawayInput): string => {
  // A package decides the package type, even when it has none.
  const packageTypeId = input.package !== null ? input.package.packageTypeId : input.packagingPackageTypeId;
  const productIds = new Set([...input.productIds, input.productId]);
  const ownCategoryId = input.categoryChain[0] ?? null;
  const rules = input.rules
    .filter(
      (rule) =>
        (rule.productId === null || productIds.has(rule.productId)) &&
        (rule.categoryId === null || input.categoryChain.includes(rule.categoryId)) &&
        (rule.packageTypeIds.length === 0 || (packageTypeId !== null && rule.packageTypeIds.includes(packageTypeId))),
    )
    .map((rule, index) => ({ rule, index }))
    .sort(
      (left, right) =>
        Number(right.rule.packageTypeIds.length > 0) - Number(left.rule.packageTypeIds.length > 0) ||
        Number(right.rule.productId !== null) - Number(left.rule.productId !== null) ||
        Number(right.rule.categoryId === ownCategoryId) - Number(left.rule.categoryId === ownCategoryId) ||
        Number(right.rule.categoryId !== null) - Number(left.rule.categoryId !== null) ||
        left.index - right.index,
    )
    .map(({ rule }) => rule);
  const destination = input.locations.get(input.destinationId);
  const candidates =
    input.candidateLocationIds === null
      ? childInternalLocations(input.destinationId, input.locations)
      : input.candidateLocationIds.flatMap((id) => input.locations.get(id) ?? []);

  if (rules.length > 0) {
    const quantities = quantityByLocation(candidates, packageTypeId, input);
    const quantityAt = (locationId: string) => quantities.get(locationId) ?? 0;
    const usable = (location: PutawayLocation) => canBeUsed(location, input.quantity, quantityAt(location.id), input);
    // Locations already refused for an earlier rule are not tried again.
    const checked = new Set<string>();

    for (const rule of rules) {
      const lastUsed = rule.sublocation === 'LAST_USED' ? (input.lastUsedLocationIds.get(rule.id) ?? null) : null;
      const locationOut = input.locations.get(lastUsed ?? rule.locationOutId);

      if (locationOut === undefined) {
        continue;
      }
      if (rule.storageCategoryId === null) {
        if (!checked.has(locationOut.id) && usable(locationOut)) {
          return locationOut.id;
        }
        continue;
      }
      const children = childInternalLocations(locationOut.id, input.locations).filter((location) => location.storageCategoryId === rule.storageCategoryId);

      // First the locations that already hold the package type, or the product.
      for (const location of children) {
        if (checked.has(location.id)) {
          continue;
        }
        const holdsAlready =
          packageTypeId !== null
            ? input.quants.some((quant) => quant.locationId === location.id && quant.packageId !== null && quant.packageTypeId === packageTypeId)
            : quantityAt(location.id) > 0;

        if (holdsAlready) {
          if (usable(location)) {
            return location.id;
          }
          checked.add(location.id);
        }
      }
      for (const location of children) {
        if (checked.has(location.id)) {
          continue;
        }
        if (usable(location)) {
          return location.id;
        }
        checked.add(location.id);
      }
    }
  }

  return destination?.usage === 'VIEW' && candidates.length > 0 ? candidates[0].id : input.destinationId;
};

// Lines put away in one call, one after the other. Until it is placed, a line
// of the call is not counted anywhere; once placed it counts as on its way
// into its location, so the next line sees the room it took. Done stock
// (`arrivingQuantity`) counts as stock in its location instead.
export const planPutawayInOrder = (entries: { key: string; input: PutawayInput; arrivingQuantity?: number }[]): Map<string, string> => {
  const keys = new Set(entries.map((entry) => entry.key));
  const placedLines: PutawayLine[] = [];
  const arrivedQuants: PutawayQuant[] = [];
  const destinations = new Map<string, string>();

  for (const { key, input, arrivingQuantity } of entries) {
    const locationId = planPutaway({
      ...input,
      quants: [...input.quants, ...arrivedQuants],
      openLines: [...input.openLines.filter((line) => !keys.has(line.id)), ...placedLines],
    });
    const existing = input.openLines.find((line) => line.id === key);

    destinations.set(key, locationId);
    if (arrivingQuantity !== undefined) {
      arrivedQuants.push({
        productId: input.productId,
        locationId,
        quantity: arrivingQuantity,
        packageId: input.package?.id ?? null,
        packageTypeId: input.package?.packageTypeId ?? null,
      });
      continue;
    }
    placedLines.push(
      existing === undefined
        ? {
            id: key,
            productId: input.productId,
            locationId: '',
            locationDestId: locationId,
            quantityProductUom: input.quantity,
            resultPackageId: input.package?.id ?? null,
            resultPackageTypeId: input.package?.packageTypeId ?? null,
            isDraft: false,
          }
        : { ...existing, locationDestId: locationId },
    );
  }

  return destinations;
};
