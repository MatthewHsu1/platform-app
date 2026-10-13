import { MOVE_STATE } from 'src/stock/stock-options.constant';
import { packageDestinationDescendants } from 'src/stock/utils/plan-package-rules.util';
import { compareAtDigits, isZeroAtDigits } from 'src/stock/utils/stock-uom.util';
import { type EntirePackLine } from 'src/stock/utils/types/entire-pack-line.type';
import { type PackageContent } from 'src/stock/utils/types/package-content.type';

type HeadedPackage = { id: string; packageDestId: string | null };

const isOpen = (line: EntirePackLine) => line.state !== MOVE_STATE.DONE && line.state !== MOVE_STATE.CANCEL;
const groupKey = (productId: string, lotId: string | null) => `${productId}|${lotId ?? ''}`;

const sums = (rows: { key: string; quantity: number }[]) => {
  const totals = new Map<string, number>();

  for (const row of rows) {
    totals.set(row.key, (totals.get(row.key) ?? 0) + row.quantity);
  }
  return totals;
};

// The transfer's lines taken from the package (and the packages inside it)
// carry exactly what the package holds, per product and lot. With no such
// line there is nothing to contradict, so the package counts as covered.
const linesCoverPackage = (content: PackageContent | undefined, packageId: string | null, transferLines: EntirePackLine[], digits: number) => {
  const inside = new Set<string | null>(content === undefined ? [packageId] : [content.packageId, ...content.descendantIds]);
  const relevant = transferLines.filter((line) => line.isStorable && inside.has(line.packageId));

  if (relevant.length === 0) {
    return true;
  }
  if (content === undefined && packageId !== null) {
    return false;
  }
  const held = sums((content?.quants ?? []).map((quant) => ({ key: groupKey(quant.productId, quant.lotId), quantity: quant.quantity })));
  const moved = sums(relevant.map((line) => ({ key: groupKey(line.productId, line.lotId), quantity: line.quantityProductUom })));
  const keys = new Set([...held.keys(), ...moved.keys()]);

  return [...keys].every((key) => isZeroAtDigits((held.get(key) ?? 0) - (moved.get(key) ?? 0), digits));
};

// Lines with no transfer never form one transfer.
const singleTransferOf = (lines: EntirePackLine[]) => {
  const transfers = new Set(lines.map((line) => line.pickingId));
  const [only] = [...transfers];

  return transfers.size === 1 && only !== null ? only : undefined;
};

// Packages going somewhere whole take their container along once every
// package of that container goes there too (a reusable container stays
// behind), then the same is asked one level up, from whatever container the
// packages are now headed into.
export const planDestForEntirePacks = ({
  resultPackageIds,
  packages,
  allowedPackageIds,
}: {
  resultPackageIds: string[];
  packages: Map<string, PackageContent>;
  allowedPackageIds?: Set<string>;
}) => {
  const updates: { id: string; packageDestId: string }[] = [];
  const destOf = new Map([...packages.values()].map((content) => [content.packageId, content.packageDestId]));
  const visited = new Set<string>();
  let level = [...new Set(resultPackageIds)];

  while (level.length > 0) {
    level.forEach((packageId) => visited.add(packageId));
    const byContainer = new Map<string, string[]>();

    for (const packageId of level) {
      const parentId = packages.get(packageId)?.parentPackageId ?? null;

      if (parentId !== null) {
        byContainer.set(parentId, [...(byContainer.get(parentId) ?? []), packageId]);
      }
    }
    for (const [containerId, members] of byContainer) {
      const container = packages.get(containerId);
      const takesAll =
        container !== undefined &&
        container.childIds.length === members.length &&
        container.childIds.every((childId) => members.includes(childId));

      if (!takesAll || container.isReusable || (allowedPackageIds !== undefined && !allowedPackageIds.has(containerId))) {
        continue;
      }
      for (const member of members) {
        if (destOf.get(member) !== containerId) {
          updates.push({ id: member, packageDestId: containerId });
          destOf.set(member, containerId);
        }
      }
    }
    level = [...new Set(level.flatMap((packageId) => destOf.get(packageId) ?? []))].filter((packageId) => !visited.has(packageId));
  }
  return updates;
};

// A source package taken whole by one transfer travels as itself: the
// transfer's open lines from it that have no destination package get it.
export const planEntirePack = ({
  lines,
  packages,
  digits,
}: {
  lines: EntirePackLine[];
  packages: Map<string, PackageContent>;
  digits: number;
}) => {
  const lineUpdates: { id: string; resultPackageId: string; isEntirePack: boolean }[] = [];
  const sourcePackageIds = [...new Set(lines.flatMap((line) => line.packageId ?? []))];

  for (const packageId of sourcePackageIds) {
    const content = packages.get(packageId);
    const packageLines = lines.filter((line) => line.packageId === packageId);
    const transferId = singleTransferOf(packageLines);

    if (content === undefined || transferId === undefined || content.isReusable) {
      continue;
    }
    if (!linesCoverPackage(content, packageId, lines.filter((line) => line.pickingId === transferId), digits)) {
      continue;
    }
    for (const packageLine of packageLines.filter((row) => row.resultPackageId === null && isOpen(row))) {
      lineUpdates.push({ id: packageLine.id, resultPackageId: packageId, isEntirePack: true });
    }
  }
  const updatedResult = new Map(lineUpdates.map((update) => [update.id, update.resultPackageId]));
  const resultPackageIds = [...new Set(lines.flatMap((line) => updatedResult.get(line.id) ?? line.resultPackageId ?? []))];

  return { lineUpdates, packageDestUpdates: planDestForEntirePacks({ resultPackageIds, packages }) };
};

// Lines marked as moving a whole package that no longer do: their
// destination package is not their source package any more, or the
// package's lines no longer sit in one transfer or no longer match what the
// package holds. `lines` are every line of the transfers concerned.
export const planEntirePackBreaks = ({
  lines,
  packages,
  digits,
}: {
  lines: EntirePackLine[];
  packages: Map<string, PackageContent>;
  digits: number;
}) => {
  const relevant = lines.filter((line) => line.isEntirePack);
  const toClear = new Set(relevant.filter((line) => line.packageId !== line.resultPackageId).map((line) => line.id));
  const packageIds = [...new Set(relevant.map((line) => line.packageId))];

  for (const packageId of packageIds) {
    const packageLines = relevant.filter((line) => line.packageId === packageId);
    const transferId = singleTransferOf(packageLines);
    const content = packageId === null ? undefined : packages.get(packageId);
    const stillWhole =
      transferId !== undefined && linesCoverPackage(content, packageId, lines.filter((line) => line.pickingId === transferId), digits);

    if (!stillWhole) {
      const transfers = new Set(packageLines.map((line) => line.pickingId));

      for (const transferLine of relevant.filter((line) => transfers.has(line.pickingId) && line.packageId === packageId)) {
        toClear.add(transferLine.id);
      }
    }
  }
  return relevant.filter((line) => toClear.has(line.id)).map((line) => line.id);
};

// The candidates headed into a container although no open line goes into
// them or into a package headed into them.
export const packagesWithoutOpenLines = ({
  candidateIds,
  packages,
  openLineResultPackageIds,
}: {
  candidateIds: string[];
  packages: HeadedPackage[];
  openLineResultPackageIds: Set<string>;
}) => {
  const destById = new Map(packages.map((pack) => [pack.id, pack.packageDestId]));

  return [...new Set(candidateIds)].filter(
    (packageId) =>
      (destById.get(packageId) ?? null) !== null &&
      ![...packageDestinationDescendants(packageId, packages)].some((id) => openLineResultPackageIds.has(id)),
  );
};

// The packages and every container each of them is headed into, up to the top.
export const destinationChains = (packageIds: string[], packages: HeadedPackage[]) => {
  const destById = new Map(packages.map((pack) => [pack.id, pack.packageDestId]));
  const found = new Set<string>();

  for (const packageId of packageIds) {
    for (let current: string | null = packageId; current !== null && !found.has(current); current = destById.get(current) ?? null) {
      found.add(current);
    }
  }
  return found;
};

// Taking packages out of their transfers: a line that brought a package
// whole goes (and its move with it when the move asked for nothing and has
// no other line); a line a user packed only loses the package. Packages
// headed into the removed ones, and the removed ones themselves, stop being
// headed anywhere; containers above that no open line reaches any more are
// freed too; the remaining lines are put away again, since their outermost
// package changed. `moves` list every line of each move, in any state.
export const planRemovePackage = ({
  packageIds,
  packages,
  openLines,
  moves,
}: {
  packageIds: string[];
  packages: HeadedPackage[];
  openLines: { id: string; resultPackageId: string | null; isEntirePack: boolean; moveId: string | null }[];
  moves: { id: string; productUomQty: number; lineIds: string[] }[];
}) => {
  const selected = new Set(packageIds);
  const ancestors = destinationChains(packageIds, packages);
  const reach = new Set(packageIds.flatMap((packageId) => [...packageDestinationDescendants(packageId, packages)]));
  const reached = openLines.filter((row) => row.resultPackageId !== null && reach.has(row.resultPackageId));
  const own = reached.filter((row) => row.resultPackageId !== null && selected.has(row.resultPackageId));
  const deleteLineIds = own.filter((row) => row.isEntirePack).map((row) => row.id);
  const deleted = new Set(deleteLineIds);
  const clearResultLineIds = own.filter((row) => !row.isEntirePack).map((row) => row.id);
  const deleteMoveIds = [...new Set(own.filter((row) => row.isEntirePack).flatMap((row) => row.moveId ?? []))].filter((moveId) => {
    const move = moves.find((candidate) => candidate.id === moveId);

    return move !== undefined && move.productUomQty === 0 && move.lineIds.every((lineId) => deleted.has(lineId));
  });
  const unhooked = packages.flatMap((pack) =>
    pack.packageDestId !== null && (selected.has(pack.packageDestId) || selected.has(pack.id)) ? [pack.id] : [],
  );
  const after = packages.map((pack) => (unhooked.includes(pack.id) ? { ...pack, packageDestId: null } : pack));
  const stillPacked = new Set(
    openLines.flatMap((row) =>
      row.resultPackageId === null || deleted.has(row.id) || clearResultLineIds.includes(row.id) ? [] : [row.resultPackageId],
    ),
  );
  const cutOff = packagesWithoutOpenLines({ candidateIds: [...ancestors], packages: after, openLineResultPackageIds: stillPacked });

  return {
    deleteLineIds,
    clearResultLineIds,
    deleteMoveIds,
    clearDestIds: [...new Set([...unhooked, ...cutOff])],
    putawayLineIds: reached.filter((row) => !deleted.has(row.id)).map((row) => row.id),
  };
};

export const NEGATIVE_PACKAGE_ADD = 'A package that holds a negative quantity cannot be added to a transfer.';

// One line per row of the packages that holds stock, moved whole into the
// transfer's destination; a negative row refuses the whole request.
export const planAddEntirePacks = ({
  quants,
  pickingId,
  locationDestId,
  digits,
}: {
  quants: {
    id: string;
    productId: string;
    productUomId: string;
    quantity: number;
    locationId: string;
    packageId: string;
    lotId: string | null;
    ownerId: string | null;
  }[];
  pickingId: string;
  locationDestId: string;
  digits: number;
}): { kind: 'refuse'; reason: string } | { kind: 'lines'; lines: { quantId: string; data: Record<string, unknown> }[] } => {
  if (quants.some((quant) => compareAtDigits(quant.quantity, 0, digits) < 0)) {
    return { kind: 'refuse', reason: NEGATIVE_PACKAGE_ADD };
  }

  return {
    kind: 'lines',
    lines: quants
      .filter((quant) => !isZeroAtDigits(quant.quantity, digits))
      .map((quant) => ({
        quantId: quant.id,
        data: {
          productId: quant.productId,
          productUomId: quant.productUomId,
          quantity: quant.quantity,
          locationId: quant.locationId,
          locationDestId,
          pickingId,
          packageId: quant.packageId,
          resultPackageId: quant.packageId,
          lotId: quant.lotId,
          ownerId: quant.ownerId,
        },
      })),
  };
};
