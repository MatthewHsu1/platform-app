import { type PackageRelocationPlan } from 'src/stock/utils/types/package-relocation-plan.type';

export const PACKAGE_NOT_EMPTY_NO_LOCATION = 'Cannot remove the location of a non empty package';
export const PACKAGE_EMPTY_CANNOT_MOVE = 'Cannot move an empty package';
export const PACKAGE_DEST_INSIDE_ITSELF = "A package can't have one of its contained packages as destination container.";
export const PACKAGE_RELOCATED_REASON = 'Package manually relocated';
export const PACKAGE_UNPACKED_REASON = 'Quantities unpacked';
export const NOTHING_TO_UNPACK = 'There is nothing to unpack in this package.';
export const NEGATIVE_PACKAGE_UNPACK = 'A package that holds a negative quantity cannot be unpacked.';

type ContentQuant = { id: string; quantity: number; reservedQuantity: number };

// A package holds what its stock rows with stock or a reservation hold, its own
// and its contained packages'.
const hasContent = (quant: ContentQuant) => quant.quantity !== 0 || quant.reservedQuantity !== 0;

// A package sits where its first positive stock is; a container where its
// first contained package (by name) sits. A package of `knownLocations` is not
// placed again: it keeps the place it shows.
export const planPackageLocations = ({
  packages,
  firstPositiveQuantLocation,
  knownLocations = new Map(),
}: {
  packages: { id: string; name: string; parentPackageId: string | null }[];
  firstPositiveQuantLocation: Map<string, string>;
  knownLocations?: Map<string, string | null>;
}) => {
  const children = new Map<string, { id: string; name: string }[]>();

  for (const pack of packages) {
    if (pack.parentPackageId !== null) {
      children.set(pack.parentPackageId, [...(children.get(pack.parentPackageId) ?? []), pack]);
    }
  }
  const located = new Map<string, string | null>();
  const visiting = new Set<string>();
  const locate = (packageId: string): string | null => {
    const known = located.get(packageId) ?? knownLocations.get(packageId);

    if (known !== undefined) {
      return known;
    }
    // Stored data with a loop in it has no answer; the loop ends here.
    if (visiting.has(packageId)) {
      return null;
    }
    visiting.add(packageId);
    const own = firstPositiveQuantLocation.get(packageId);
    const firstChild = [...(children.get(packageId) ?? [])].sort(
      (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
    )[0];
    const location = own ?? (firstChild === undefined ? null : locate(firstChild.id));

    located.set(packageId, location);
    return location;
  };

  for (const pack of packages) {
    locate(pack.id);
  }
  return located;
};

// A typed location moves the package's positive stock there, keeping its
// contained packages inside it. Stock already in that place has nothing to
// move: a second delivery of the same edit finds it there.
export const planPackageRelocation = ({
  packageId,
  newLocationId,
  containedQuants,
}: {
  packageId: string;
  newLocationId: string | null;
  containedQuants: (ContentQuant & { locationId: string })[];
}): PackageRelocationPlan => {
  const isEmpty = !containedQuants.some(hasContent);

  if (newLocationId === null) {
    return isEmpty ? { kind: 'nothing' } : { kind: 'refuse', reason: PACKAGE_NOT_EMPTY_NO_LOCATION };
  }
  if (isEmpty) {
    return { kind: 'refuse', reason: PACKAGE_EMPTY_CANNOT_MOVE };
  }
  const positive = containedQuants.filter((quant) => quant.quantity > 0);

  if (positive.every((quant) => quant.locationId === newLocationId)) {
    return { kind: 'nothing' };
  }
  return { kind: 'move', quantIds: positive.map((quant) => quant.id), upToParentPackageIds: [packageId] };
};

export const packageDestinationDescendants = (
  packageId: string,
  packages: { id: string; packageDestId: string | null }[],
) => {
  const found = new Set([packageId]);
  let grew = true;

  while (grew) {
    grew = false;
    for (const pack of packages) {
      if (pack.packageDestId !== null && found.has(pack.packageDestId) && !found.has(pack.id)) {
        found.add(pack.id);
        grew = true;
      }
    }
  }
  return found;
};

// Moved packages that keep their containers: a package's container travels
// with it (as its destination container) when every row with content in that
// container, its packages' included, is moved too; the climb stops at a
// package of `limitIds`, which itself leaves its container.
export const planKeptContainers = ({
  movedQuants,
  packages,
  contentQuants,
  limitIds,
}: {
  movedQuants: { id: string; packageId: string | null }[];
  packages: { id: string; parentPackageId: string | null }[];
  contentQuants: { id: string; packageId: string | null }[];
  limitIds: string[];
}) => {
  const moved = new Set(movedQuants.map((quant) => quant.id));
  const limit = new Set(limitIds);
  const parentOf = new Map(packages.map((pack) => [pack.id, pack.parentPackageId]));
  const isUnder = (packageId: string, containerId: string) => {
    const seen = new Set<string>();

    for (let current: string | null = packageId; current !== null && !seen.has(current); current = parentOf.get(current) ?? null) {
      if (current === containerId) {
        return true;
      }
      seen.add(current);
    }
    return false;
  };
  const wholeContentMoves = (containerId: string) =>
    contentQuants.every((quant) => quant.packageId === null || !isUnder(quant.packageId, containerId) || moved.has(quant.id));
  const kept = new Map<string, string>();

  for (const startId of new Set(movedQuants.flatMap((quant) => quant.packageId ?? []))) {
    const seen = new Set<string>();

    for (let packageId = startId; !seen.has(packageId); ) {
      seen.add(packageId);
      const parentId = parentOf.get(packageId) ?? null;

      if (parentId === null || limit.has(packageId) || !wholeContentMoves(parentId)) {
        break;
      }
      kept.set(packageId, parentId);
      packageId = parentId;
    }
  }
  return kept;
};

// Unpacking frees the contained packages and moves the package's stock out of
// it, in the same place. A negative row cannot be moved out, and the whole
// unpack fails on it; a row that only holds a reservation has nothing to move.
export const planUnpack = ({ childIds, quants }: { childIds: string[]; quants: ContentQuant[] }) => {
  if (childIds.length === 0 && !quants.some(hasContent)) {
    return { kind: 'refuse' as const, reason: NOTHING_TO_UNPACK };
  }
  if (quants.some((quant) => quant.quantity < 0)) {
    return { kind: 'refuse' as const, reason: NEGATIVE_PACKAGE_UNPACK };
  }
  return {
    kind: 'unpack' as const,
    childIds,
    quantIds: quants.filter((quant) => quant.quantity > 0).map((quant) => quant.id),
  };
};
