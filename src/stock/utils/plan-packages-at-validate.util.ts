import { packageDestinationDescendants, planPackageLocations } from 'src/stock/utils/plan-package-rules.util';
import { type PackageHistoryRow } from 'src/stock/utils/types/package-history-row.type';
import { type PackageMoveLine } from 'src/stock/utils/types/package-move-line.type';
import { type PackageNode } from 'src/stock/utils/types/package-node.type';
import { type TrackingRefusal } from 'src/stock/utils/types/tracking-refusal.type';

export const PACKAGE_SPLIT_MESSAGE =
  'You cannot move the same package content more than once in the same transfer or split the same package into two location.\nPackage: {package}';
export const CONTAINER_SPLIT_MESSAGE =
  'Packages {packages} are moved to different locations while being in the same container {container}.';
export const CONTAINER_ELSEWHERE_MESSAGE =
  "Can't move a container having packages in another location ({oldLocation}) to a different location ({newLocation}).";

type PackageQuant = { packageId: string; locationId: string; quantity: number };

const EPSILON = 1e-9;

const addTo = (perPackage: Map<string, Map<string, number>>, packageId: string, locationId: string, quantity: number) => {
  const perLocation = perPackage.get(packageId) ?? new Map<string, number>();

  perLocation.set(locationId, (perLocation.get(locationId) ?? 0) + quantity);
  perPackage.set(packageId, perLocation);
};

// The stock of each package per location once the lines are done: what it
// holds now, less what the lines take out, plus what they put in. Quants come
// first, oldest first, so the first place with stock is the one the package
// shows.
const projectedStock = (quants: PackageQuant[], lines: PackageMoveLine[]) => {
  const perPackage = new Map<string, Map<string, number>>();

  for (const quant of quants) {
    addTo(perPackage, quant.packageId, quant.locationId, quant.quantity);
  }
  for (const line of lines) {
    if (line.packageId !== null) {
      addTo(perPackage, line.packageId, line.locationId, -line.quantityProductUom);
    }
    if (line.resultPackageId !== null) {
      addTo(perPackage, line.resultPackageId, line.locationDestId, line.quantityProductUom);
    }
  }
  return perPackage;
};

export const projectPackageStock = (quants: PackageQuant[], lines: PackageMoveLine[]) => {
  const firstPositiveLocation = new Map<string, string>();
  const nonZeroLocations = new Map<string, Set<string>>();

  for (const [packageId, perLocation] of projectedStock(quants, lines)) {
    const entries = [...perLocation.entries()];
    const firstPositive = entries.find(([, quantity]) => quantity > EPSILON)?.[0];

    if (firstPositive !== undefined) {
      firstPositiveLocation.set(packageId, firstPositive);
    }
    nonZeroLocations.set(packageId, new Set(entries.filter(([, quantity]) => Math.abs(quantity) > EPSILON).map(([id]) => id)));
  }
  return { firstPositiveLocation, nonZeroLocations };
};

// Validate cannot take stock back once it moved, so a destination package
// that would hold stock in two places once the lines are done is refused
// before anything is written.
export const checkPackageLocations = ({
  lines,
  quants,
  packageNames,
}: {
  lines: PackageMoveLine[];
  quants: PackageQuant[];
  packageNames: Map<string, string>;
}): TrackingRefusal[] => {
  const resultPackageIds = [...new Set(lines.flatMap((line) => line.resultPackageId ?? []))];
  const projected = projectedStock(quants, lines);

  return resultPackageIds.flatMap((packageId) => {
    const placesWithStock = [...(projected.get(packageId)?.values() ?? [])].filter((quantity) => quantity > EPSILON);

    return placesWithStock.length > 1
      ? [{ message: PACKAGE_SPLIT_MESSAGE, values: { package: packageNames.get(packageId) ?? packageId } }]
      : [];
  });
};

// Once the stock moved, each package goes into its destination container
// (or out of its container when it has none), then the containers they went
// into do the same, level by level upward. Packages of one container must end
// in one place, and a container cannot join them while packages already in
// it sit elsewhere.
export const planApplyDestToPackage = ({
  startPackageIds,
  packages,
  packageLocation,
  quantLocations,
  locationNames,
}: {
  startPackageIds: string[];
  packages: Map<string, PackageNode>;
  packageLocation: Map<string, string | null>;
  quantLocations: Map<string, Set<string>>;
  locationNames: Map<string, string>;
}) => {
  const parentOf = new Map([...packages.values()].map((pack) => [pack.id, pack.parentPackageId]));
  const destOf = new Map([...packages.values()].map((pack) => [pack.id, pack.packageDestId]));
  const location = new Map(packageLocation);
  const writes: { id: string; parentPackageId: string | null; packageDestId: null }[] = [];
  const errors: TrackingRefusal[] = [];
  const refusedContainerIds: string[] = [];
  const processed = new Set<string>();
  const nameOf = (id: string) => packages.get(id)?.name ?? id;
  const locationName = (id: string | null) => (id === null ? '' : (locationNames.get(id) ?? id));
  const isInside = (packageId: string, containerId: string) => {
    const seen = new Set<string>();

    for (let current: string | null = packageId; current !== null && !seen.has(current); current = parentOf.get(current) ?? null) {
      if (current === containerId) {
        return true;
      }
      seen.add(current);
    }
    return false;
  };
  const containedLocations = (containerId: string) =>
    new Set(
      [...parentOf.keys()]
        .filter((id) => isInside(id, containerId))
        .flatMap((id) => [...(quantLocations.get(id) ?? new Set<string>())]),
    );
  let todo = startPackageIds;

  while (todo.length > 0) {
    const level = [...new Set(todo)].filter((id) => !processed.has(id));

    if (level.length === 0) {
      break;
    }
    const groups = new Map<string | null, string[]>();

    for (const id of level) {
      const destId = destOf.get(id) ?? null;

      groups.set(destId, [...(groups.get(destId) ?? []), id]);
    }
    for (const [containerId, members] of groups) {
      if (containerId === null) {
        for (const id of members.filter((member) => (parentOf.get(member) ?? null) !== null)) {
          writes.push({ id, parentPackageId: null, packageDestId: null });
          parentOf.set(id, null);
        }
        members.forEach((member) => processed.add(member));
        continue;
      }
      const newLocations = [...new Set(members.map((member) => location.get(member) ?? null))];

      if (newLocations.length > 1) {
        refusedContainerIds.push(containerId);
        errors.push({
          message: CONTAINER_SPLIT_MESSAGE,
          values: { packages: members.map(nameOf).join(', '), container: nameOf(containerId) },
        });
      } else {
        const newLocation = newLocations[0] ?? null;
        const contained = containedLocations(containerId);

        if (contained.size > 0 && !(contained.size === 1 && newLocation !== null && contained.has(newLocation))) {
          refusedContainerIds.push(containerId);
          errors.push({
            message: CONTAINER_ELSEWHERE_MESSAGE,
            values: {
              oldLocation: [...contained].filter((id) => id !== newLocation).map(locationName).join(', '),
              newLocation: locationName(newLocation),
            },
          });
        }
        location.set(containerId, newLocation);
      }
      for (const id of members) {
        writes.push({ id, parentPackageId: containerId, packageDestId: null });
        parentOf.set(id, containerId);
        destOf.set(id, null);
        processed.add(id);
      }
    }
    const parents = [...new Set(level.flatMap((id) => parentOf.get(id) ?? []))];
    const goesOn = parents.some((id) => (destOf.get(id) ?? null) !== null || (parentOf.get(id) ?? null) !== null);

    todo = goesOn ? parents : [];
  }
  return { errors, writes, refusedContainerIds };
};

// The package refusals Validate would meet once the stock moved, judged on
// the stock as it will be: first the containers the packages go into, then a
// package split over two places. The first is the answer.
export const checkPackagesBeforeCommit = ({
  lines,
  packages,
  packageQuants,
  locationNames,
}: {
  lines: PackageMoveLine[];
  packages: Map<string, PackageNode>;
  packageQuants: PackageQuant[];
  locationNames: Map<string, string>;
}): TrackingRefusal[] => {
  const after = projectPackageStock(packageQuants, lines);
  const containers = planApplyDestToPackage({
    startPackageIds: [...new Set(lines.flatMap((line) => line.resultPackageId ?? []))],
    packages,
    packageLocation: planPackageLocations({ packages: [...packages.values()], firstPositiveQuantLocation: after.firstPositiveLocation }),
    quantLocations: after.nonZeroLocations,
    locationNames,
  });

  return [
    ...containers.errors,
    ...checkPackageLocations({
      lines,
      quants: packageQuants,
      packageNames: new Map([...packages.values()].map((pack) => [pack.id, pack.name])),
    }),
  ];
};

// The package's name as it will read inside its destination containers.
const destinationName = (packageId: string, packages: Map<string, PackageNode>, seen = new Set<string>()): string => {
  const pack = packages.get(packageId);

  if (pack === undefined) {
    return '';
  }
  if (pack.packageDestId === null || seen.has(pack.packageDestId)) {
    return pack.name;
  }
  seen.add(packageId);
  return `${destinationName(pack.packageDestId, packages, seen)} > ${pack.name}`;
};

const outermostOf = (packageId: string, packages: Map<string, PackageNode>) => {
  const seen = new Set<string>();
  let current = packageId;

  while (!seen.has(current)) {
    seen.add(current);
    const next = packages.get(current)?.packageDestId ?? null;

    if (next === null) {
      return current;
    }
    current = next;
  }
  return current;
};

// One frozen row per package of the destination chains of the result
// packages, taken before the stock moves: where it is and where its open
// lines take it, its container now and the one it is headed into, with their
// names as they read today, and the transfers and lines that move it.
export const planPackageHistory = ({
  resultPackageIds,
  packages,
  openLines,
}: {
  resultPackageIds: string[];
  packages: Map<string, PackageNode>;
  openLines: { id: string; resultPackageId: string; locationDestId: string; pickingId: string | null }[];
}): PackageHistoryRow[] => {
  const chain = new Set<string>();

  for (const packageId of resultPackageIds) {
    for (let current: string | null = packageId; current !== null && !chain.has(current) && packages.has(current); ) {
      chain.add(current);
      current = packages.get(current)?.packageDestId ?? null;
    }
  }
  const destinationLinks = [...packages.values()].map((pack) => ({ id: pack.id, packageDestId: pack.packageDestId }));

  return [...chain].flatMap((packageId) => {
    const pack = packages.get(packageId);

    if (pack === undefined) {
      return [];
    }
    const inside = packageDestinationDescendants(packageId, destinationLinks);
    const lines = openLines.filter((line) => inside.has(line.resultPackageId));
    const parent = pack.parentPackageId === null ? undefined : packages.get(pack.parentPackageId);

    return [
      {
        packageId,
        packageName: pack.completeName,
        locationId: pack.locationId,
        locationDestId: lines[0]?.locationDestId ?? null,
        parentOrigId: pack.parentPackageId,
        parentOrigName: parent?.completeName ?? null,
        parentDestId: pack.packageDestId,
        parentDestName: pack.packageDestId === null ? null : destinationName(pack.packageDestId, packages),
        outermostDestId: outermostOf(packageId, packages),
        pickingIds: [...new Set(lines.flatMap((line) => line.pickingId ?? []))],
        moveLineIds: lines.filter((line) => line.resultPackageId === packageId).map((line) => line.id),
      },
    ];
  });
};
