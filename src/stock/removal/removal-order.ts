import { compareFefo } from 'src/product-expiry/fefo-order';
import { compareCreation, compareInDate, compareText } from 'src/stock/removal/removal-compare';
import { REMOVAL_METHOD } from 'src/stock/routing-options.constant';
import { type RemovalMethod } from 'src/stock/removal/types/removal-method.type';
import { type RemovalQuant } from 'src/stock/removal/types/removal-quant.type';

export class RemovalStrategyNotImplementedError extends Error {
  constructor(readonly method: string) {
    super(`Removal strategy ${method} not implemented.`);
    this.name = 'RemovalStrategyNotImplementedError';
  }
}

// The category's strategy wins; else the first one found walking up from the
// source location; else first in, first out.
export const pickRemovalStrategy = (
  categoryMethod: RemovalMethod | null,
  locationChainMethods: (RemovalMethod | null)[],
): RemovalMethod =>
  categoryMethod ??
  locationChainMethods.find((method): method is RemovalMethod => method !== null) ??
  REMOVAL_METHOD.FIFO;

const SORT_BY_METHOD: Partial<Record<RemovalMethod, (left: RemovalQuant, right: RemovalQuant) => number>> = {
  [REMOVAL_METHOD.FIFO]: (left, right) => compareInDate(left, right) || compareCreation(left, right),
  [REMOVAL_METHOD.LEAST_PACKAGES]: (left, right) => compareInDate(left, right) || compareCreation(left, right),
  [REMOVAL_METHOD.LIFO]: (left, right) => compareInDate(right, left) || compareCreation(right, left),
  [REMOVAL_METHOD.CLOSEST]: (left, right) =>
    compareText(left.locationCompleteName ?? '', right.locationCompleteName ?? '') || compareCreation(right, left),
  [REMOVAL_METHOD.FEFO]: compareFefo,
};

// Quants with a lot come before quants without one, whatever the strategy.
export const removalOrder = <TQuant extends RemovalQuant>(quants: TQuant[], method: RemovalMethod): TQuant[] => {
  const sort = SORT_BY_METHOD[method];

  if (sort === undefined) {
    throw new RemovalStrategyNotImplementedError(method);
  }

  return [...quants].sort(sort).sort((left, right) => Number(left.lotId === null) - Number(right.lotId === null));
};

type PackageItem = { packageId: string | null; createdAt: string | null; free: number };
type SearchNode = { remaining: number; taken: PackageItem[]; nextIndex: number };
type QueuedNode = { priority: number; node: SearchNode };

// A logic function cannot catch running out of memory, so the search stops
// here and leaves the quants unnarrowed.
const MAX_POPPED_NODES = 10_000;

const comparePackageLists = (left: PackageItem[], right: PackageItem[]) => {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const difference =
      compareText(left[index].createdAt ?? '', right[index].createdAt ?? '') ||
      compareText(left[index].packageId ?? '', right[index].packageId ?? '') ||
      left[index].free - right[index].free;

    if (difference !== 0) {
      return difference;
    }
  }

  return left.length - right.length;
};

// Equal priorities pop the node with less left to take first, then the
// smaller list of packages, then the smaller next index.
const compareQueued = (left: QueuedNode, right: QueuedNode) =>
  left.priority - right.priority ||
  left.node.remaining - right.node.remaining ||
  comparePackageLists(left.node.taken, right.node.taken) ||
  left.node.nextIndex - right.node.nextIndex;

const makeQueue = () => {
  const heap: QueuedNode[] = [];
  const swap = (left: number, right: number) => {
    [heap[left], heap[right]] = [heap[right], heap[left]];
  };

  const push = (entry: QueuedNode) => {
    heap.push(entry);
    let index = heap.length - 1;

    while (index > 0) {
      const parent = (index - 1) >> 1;

      if (compareQueued(heap[index], heap[parent]) >= 0) {
        break;
      }
      swap(index, parent);
      index = parent;
    }
  };

  const pop = (): QueuedNode | undefined => {
    const top = heap[0];
    const last = heap.pop();

    if (heap.length > 0 && last !== undefined) {
      heap[0] = last;
      let index = 0;

      for (;;) {
        const left = 2 * index + 1;
        const right = left + 1;
        let smallest = index;

        if (left < heap.length && compareQueued(heap[left], heap[smallest]) < 0) {
          smallest = left;
        }
        if (right < heap.length && compareQueued(heap[right], heap[smallest]) < 0) {
          smallest = right;
        }
        if (smallest === index) {
          break;
        }
        swap(index, smallest);
        index = smallest;
      }
    }

    return top;
  };

  return { push, pop };
};

// Picks the fewest packages that cover the quantity (best-first search over
// package sizes). Loose stock counts one item per whole unit. Returns the
// quants reservation may take; the input unchanged when no package holds stock
// or no quantity is asked for.
export const planLeastPackages = <TQuant extends RemovalQuant>(quants: TQuant[], quantity: number): TQuant[] => {
  if (quantity === 0) {
    return quants;
  }
  const freeByPackage = new Map<string | null, number>();
  const createdAtByPackage = new Map<string | null, string | null>();

  for (const quant of quants) {
    freeByPackage.set(quant.packageId, (freeByPackage.get(quant.packageId) ?? 0) + quant.quantity - quant.reservedQuantity);
    createdAtByPackage.set(quant.packageId, quant.packageCreatedAt ?? null);
  }

  const groups = [...freeByPackage.entries()]
    .filter(([, free]) => free > 0)
    .map(([packageId, free]) => ({ packageId, createdAt: createdAtByPackage.get(packageId) ?? null, free }))
    .sort(
      (left, right) =>
        right.free - left.free ||
        compareText(left.createdAt ?? '', right.createdAt ?? '') ||
        compareText(left.packageId ?? '', right.packageId ?? ''),
    );
  const packageItems: PackageItem[] = groups.filter((group) => group.packageId !== null);

  if (packageItems.length === 0) {
    return quants;
  }

  const looseFree = groups.find((group) => group.packageId === null)?.free ?? 0;
  const items: PackageItem[] = [
    ...packageItems,
    ...Array.from({ length: Math.trunc(looseFree) }, () => ({ packageId: null, createdAt: null, free: 1 })),
  ];
  const priorityOf = (node: SearchNode) =>
    node.nextIndex < items.length ? node.taken.length + node.remaining / items[node.nextIndex].free : node.taken.length;
  const queue = makeQueue();
  let bestLeaf: SearchNode = { remaining: quantity, taken: [], nextIndex: 0 };
  let answer: SearchNode | null = null;
  let popped = 0;

  queue.push({ priority: 0, node: bestLeaf });

  for (let entry = queue.pop(); entry !== undefined && answer === null; entry = queue.pop()) {
    const current = entry.node;
    popped += 1;

    if (popped > MAX_POPPED_NODES) {
      return quants;
    }
    if (current.remaining <= 0) {
      answer = current;
      break;
    }

    // One branch per package size: two packages of the same size lead to the same search.
    let lastFree: number | null = null;

    for (let index = current.nextIndex; index < items.length; index += 1) {
      const item = items[index];

      if (item.free === lastFree) {
        continue;
      }
      lastFree = item.free;

      const child: SearchNode = {
        remaining: current.remaining - item.free,
        taken: [...current.taken, item],
        nextIndex: index + 1,
      };

      if (child.remaining < 0) {
        if (
          bestLeaf.remaining > 0 ||
          child.taken.length < bestLeaf.taken.length ||
          (child.taken.length === bestLeaf.taken.length && child.remaining > bestLeaf.remaining)
        ) {
          bestLeaf = child;
        }
        continue;
      }
      if (child.nextIndex >= items.length && child.remaining !== 0) {
        if (child.remaining < bestLeaf.remaining) {
          bestLeaf = child;
        }
        continue;
      }
      queue.push({ priority: priorityOf(child), node: child });
    }
  }

  const chosen = answer ?? bestLeaf;
  const takenPackageIds = new Set(chosen.taken.flatMap((item) => (item.packageId === null ? [] : [item.packageId])));
  const looseCount = chosen.taken.filter((item) => item.packageId === null).length;
  const looseQuants = quants.filter((quant) => quant.packageId === null).sort(compareCreation);

  // Each loose unit taken claims one loose quant, newest first; more units than quants take them all.
  return [
    ...quants.filter((quant) => quant.packageId !== null && takenPackageIds.has(quant.packageId)),
    ...looseQuants.slice(Math.max(looseQuants.length - looseCount, 0)),
  ];
};
