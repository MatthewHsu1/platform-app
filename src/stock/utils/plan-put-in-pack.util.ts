import { packageDestinationDescendants } from 'src/stock/utils/plan-package-rules.util';
import { type PackAnswer } from 'src/stock/utils/types/pack-answer.type';
import { type PackLine } from 'src/stock/utils/types/pack-line.type';
import { type PackTarget } from 'src/stock/utils/types/pack-target.type';
import { type PutInPackPlan } from 'src/stock/utils/types/put-in-pack-plan.type';

export const PACK_DIFFERENT_TYPES =
  'You cannot pack products into the same package when they are from different transfers with different operation types';
export const NOTHING_TO_PACK = 'There is nothing to pack.';
export const PACK_PICKING_CLOSED = 'Put in Pack is only possible on a transfer that is not draft, done or cancelled.';
export const PACK_LINES_CLOSED = 'Put in Pack is only possible on lines that are not draft, done or cancelled.';
export const PACKAGES_WITHOUT_OPEN_LINES = 'These packages have no open lines to pack.';
export const PACK_DESTINATION_NOT_OFFERED = 'Choose one of the destinations of the lines to pack.';

type HeadedPackage = { id: string; packageDestId: string | null };

const unique = <TValue>(values: TValue[]) => [...new Set(values)];

const isLive = (line: PackLine) => line.state !== 'DONE' && line.state !== 'CANCEL' && line.quantity > 0;

const nothingChosen = (answer: PackAnswer) =>
  !answer.fromPackageWizard && answer.packageId === null && answer.packageTypeId === null && !answer.packageName;

const targetOf = (answer: PackAnswer, fallbackTypeId: string | null): PackTarget =>
  answer.packageId !== null
    ? { kind: 'existing', packageId: answer.packageId }
    : { kind: 'new', packageTypeId: answer.packageTypeId ?? fallbackTypeId, name: answer.packageName };

// Lines without a package are packed; when every line is packed already,
// their outermost packages are packed instead. Once one line is picked, the
// unpicked lines wait.
export const planPutInPack = ({
  lines,
  explicitPackageIds,
  outermostOf,
  setPackageType,
  answer,
}: {
  lines: PackLine[];
  explicitPackageIds: string[];
  outermostOf: (packageId: string) => string;
  setPackageType: boolean;
  answer: PackAnswer;
}): PutInPackPlan => {
  const askPackage = setPackageType && nothingChosen(answer);

  if (explicitPackageIds.length > 0) {
    return askPackage
      ? { kind: 'askPackage', lineIds: [], packageIds: explicitPackageIds, defaultLocationDestId: lines[0]?.locationDestId ?? null }
      : { kind: 'packPackages', packageIds: explicitPackageIds, target: targetOf(answer, null) };
  }
  if (unique(lines.flatMap((line) => line.pickingTypeId ?? [])).length > 1) {
    return { kind: 'refuse', reason: PACK_DIFFERENT_TYPES };
  }
  const live = lines.filter(isLive);
  const picked = live.filter((line) => line.picked);
  const candidates = picked.length > 0 ? picked : live;
  const toPack = candidates.filter((line) => line.resultPackageId === null);

  if (toPack.length > 0) {
    const destinations = unique(toPack.map((line) => line.locationDestId));

    if (destinations.length > 1) {
      return { kind: 'askDestination', lineIds: toPack.map((line) => line.id), locationDestIds: destinations };
    }
    if (askPackage) {
      return { kind: 'askPackage', lineIds: toPack.map((line) => line.id), packageIds: [], defaultLocationDestId: destinations[0] };
    }
    const packagingTypes = unique(toPack.flatMap((line) => line.packagingPackageTypeId ?? []));

    return {
      kind: 'packLines',
      lineIds: toPack.map((line) => line.id),
      target: targetOf(answer, packagingTypes.length === 1 ? packagingTypes[0] : null),
      singleLine: toPack.length === 1,
    };
  }
  const packageIds = unique(candidates.flatMap((line) => (line.resultPackageId === null ? [] : [outermostOf(line.resultPackageId)])));

  if (packageIds.length === 0) {
    return { kind: 'nothing' };
  }
  return { kind: 'packPackages', packageIds, target: targetOf(answer, null) };
};

// The Put in Pack pop-up follows the setting of the lines' operation type
// only when they share exactly one; lines of several types, or of none, have no setting.
export const singleOperationType = (pickingTypeIds: (string | null)[]) => {
  const typeIds = unique(pickingTypeIds.flatMap((id) => id ?? []));

  return typeIds.length === 1 ? typeIds[0] : null;
};

export const outermostPackage = (packageId: string, packages: HeadedPackage[]) => {
  const destById = new Map(packages.map((pack) => [pack.id, pack.packageDestId]));
  const seen = new Set<string>();
  let current = packageId;

  while (!seen.has(current)) {
    seen.add(current);
    const next = destById.get(current) ?? null;

    if (next === null) {
      return current;
    }
    current = next;
  }
  return current;
};

// The containers above a package, through the destination links (the package included).
const destinationChain = (packageId: string, destById: Map<string, string | null>) => {
  const chain = new Set<string>();

  for (let current: string | null = packageId; current !== null && !chain.has(current); current = destById.get(current) ?? null) {
    chain.add(current);
  }
  return chain;
};

// The moved packages are headed into the target. Every package of their old
// destination chains, the moved ones included, keeps a destination only while
// open lines still go into it or into a package headed into it.
export const planPackageDestChange = ({
  packages,
  movedIds,
  targetId,
  openLineResultPackageIds,
}: {
  packages: HeadedPackage[];
  movedIds: string[];
  targetId: string;
  openLineResultPackageIds: Set<string>;
}) => {
  const destById = new Map(packages.map((pack) => [pack.id, pack.packageDestId]));
  const moved = new Set(movedIds);
  const previous = new Set(movedIds.flatMap((movedId) => [...destinationChain(movedId, destById)]));
  const after = [...new Set([...packages.map((pack) => pack.id), ...movedIds])].map((id) => ({
    id,
    packageDestId: moved.has(id) ? targetId : (destById.get(id) ?? null),
  }));
  const hasOpenLines = (packageId: string) =>
    [...packageDestinationDescendants(packageId, after)].some((id) => openLineResultPackageIds.has(id));
  const cleared = new Set([...previous].filter((packageId) => !hasOpenLines(packageId)));

  return {
    setDest: movedIds.filter((id) => !cleared.has(id) && (destById.get(id) ?? null) !== targetId),
    clearDest: [...previous].filter((id) => cleared.has(id) && (destById.get(id) ?? null) !== null),
  };
};

// The existing packages the Put in Pack pop-up offers: of the chosen type (any
// when none is chosen), and either in the destination, a container of the
// packages being packed, or nowhere yet and not headed somewhere else.
export const packageChoiceIds = ({
  packages,
  headed,
  openLines,
  packageTypeId,
  locationDestId,
  originPackageIds,
}: {
  packages: { id: string; packageTypeId: string | null; locationId: string | null }[];
  headed: HeadedPackage[];
  openLines: { resultPackageId: string; locationDestId: string }[];
  packageTypeId: string | null;
  locationDestId: string | null;
  originPackageIds: string[];
}) => {
  const origins = new Set(originPackageIds);
  const graph = [...headed, ...packages.filter((pack) => !headed.some((row) => row.id === pack.id)).map((pack) => ({ id: pack.id, packageDestId: null }))];
  const lineDestinations = (packageId: string) => {
    const inside = packageDestinationDescendants(packageId, graph);

    return openLines.filter((line) => inside.has(line.resultPackageId)).map((line) => line.locationDestId);
  };

  return packages
    .filter((pack) => packageTypeId === null || pack.packageTypeId === packageTypeId)
    .filter((pack) => {
      if (pack.locationId === locationDestId || origins.has(pack.id)) {
        return true;
      }
      if (pack.locationId !== null) {
        return false;
      }
      const destinations = lineDestinations(pack.id);

      return destinations.length === 0 || destinations.includes(locationDestId ?? '');
    })
    .map((pack) => pack.id);
};
