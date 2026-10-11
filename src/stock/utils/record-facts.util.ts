import { formatSequenceNumber } from 'src/base/sequence/next-number';
import { LOCATION_USAGE, PICKING_TYPE_CODE, PRODUCT_TRACKING } from 'src/stock/stock-options.constant';
import { type MoveLotTotal } from 'src/stock/utils/types/move-lot-total.type';
import { type PackageContentLine } from 'src/stock/utils/types/package-content-line.type';
import { type PackageContentQuant } from 'src/stock/utils/types/package-content-quant.type';
import { type PackageContentSummary } from 'src/stock/utils/types/package-content-summary.type';

// The serial a product's own sequence gives next; with no sequence, the
// default seven-digit numbering starts at 1.
export const nextSerialOfSequence = (sequence: { numberNext: number; padding: number } | null) =>
  sequence === null ? '0000001' : formatSequenceNumber('', sequence.padding, sequence.numberNext);

// The same day a year earlier; 29 February falls back to the 28th.
export const oneYearBefore = (now: string) => {
  const date = new Date(now);
  const year = date.getUTCFullYear() - 1;
  const lastDayOfMonth = new Date(Date.UTC(year, date.getUTCMonth() + 1, 0)).getUTCDate();

  date.setUTCFullYear(year, date.getUTCMonth(), Math.min(date.getUTCDate(), lastDayOfMonth));

  return date.toISOString();
};

export const movesInOut = (groups: { pickingTypeCode: string | null; count: number }[]) => ({
  movesIn: groups.filter((group) => group.pickingTypeCode === PICKING_TYPE_CODE.INCOMING).reduce((total, group) => total + group.count, 0),
  movesOut: groups.filter((group) => group.pickingTypeCode === PICKING_TYPE_CODE.OUTGOING).reduce((total, group) => total + group.count, 0),
});

// On a product the counts add up, but min and max are each variant's sums in
// turn, so the variant listed last gives them.
export const reorderingSummary = (
  groups: { productId: string; count: number; minSum: number; maxSum: number }[],
  forTemplate: boolean,
) =>
  groups.reduce(
    (summary, group) => ({
      nbrReorderingRules: summary.nbrReorderingRules + group.count,
      reorderingMinQty: forTemplate ? group.minSum : summary.reorderingMinQty + group.minSum,
      reorderingMaxQty: forTemplate ? group.maxSum : summary.reorderingMaxQty + group.maxSum,
    }),
    { nbrReorderingRules: 0, reorderingMinQty: 0, reorderingMaxQty: 0 },
  );

// Variants in list order: internal reference, those without one last, then
// the oldest first (all variants of a product share its name).
export const sortVariantsInListOrder = <TVariant extends { defaultCode: string | null; createdAt: string }>(variants: TVariant[]) => {
  const rank = (code: string | null) => (code === null || code === '' ? 1 : 0);

  return [...variants].sort((left, right) => {
    const byRank = rank(left.defaultCode) - rank(right.defaultCode);

    if (byRank !== 0) {
      return byRank;
    }
    return (left.defaultCode ?? '').localeCompare(right.defaultCode ?? '') || left.createdAt.localeCompare(right.createdAt);
  });
};

const HOLDING_USAGES = new Set<string>([LOCATION_USAGE.INTERNAL, LOCATION_USAGE.TRANSIT]);

// A serial number held in stock in two places at once marks every row of that
// serial, wherever it is.
export const duplicatedSerialQuantIds = (
  quants: { id: string; lotId: string | null; tracking: string; quantity: number; locationUsage: string }[],
) => {
  const holders = new Map<string, number>();

  for (const quant of quants) {
    if (quant.lotId !== null && quant.tracking === PRODUCT_TRACKING.SERIAL && quant.quantity > 0 && HOLDING_USAGES.has(quant.locationUsage)) {
      holders.set(quant.lotId, (holders.get(quant.lotId) ?? 0) + 1);
    }
  }
  const duplicated = new Set([...holders].filter(([, count]) => count > 1).map(([lotId]) => lotId));

  return new Set(quants.filter((quant) => quant.lotId !== null && duplicated.has(quant.lotId)).map((quant) => quant.id));
};

type ListFormatConstructor = new (locale: string, options: { style: 'long'; type: 'conjunction' }) => { format: (items: string[]) => string };

// Every runtime the app runs on has Intl.ListFormat; the compiler's library list is older than it.
const { ListFormat } = Intl as unknown as { ListFormat: ListFormatConstructor };

const listFormat = (locale: string) => {
  try {
    return new ListFormat(locale, { style: 'long', type: 'conjunction' });
  } catch {
    return new ListFormat('en', { style: 'long', type: 'conjunction' });
  }
};

// What a package holds, the packages inside it included; the owner is the one
// owner of the stock directly in it, if there is exactly one.
export const packageContentSummary = ({
  locale,
  baseWeight,
  childBaseWeights,
  directQuants,
  childQuants,
}: {
  locale: string;
  baseWeight: number;
  childBaseWeights: number[];
  directQuants: PackageContentQuant[];
  childQuants: PackageContentQuant[];
}): PackageContentSummary => {
  const contained = [...directQuants, ...childQuants];
  const grouped = new Map<string, PackageContentLine>();

  for (const quant of contained) {
    const key = `${quant.uomName}|${quant.productId}`;
    const line = grouped.get(key) ?? { productId: quant.productId, productName: quant.productName, uomName: quant.uomName, quantity: 0 };

    grouped.set(key, { ...line, quantity: line.quantity + quant.quantity });
  }
  const lines = [...grouped.values()];
  const owners = new Set(directQuants.map((quant) => quant.ownerId));

  return {
    lines,
    description: listFormat(locale).format(lines.map((line) => `${line.quantity} ${line.uomName} ${line.productName}`)),
    weight:
      baseWeight +
      childBaseWeights.reduce((total, weight) => total + weight, 0) +
      contained.reduce((total, quant) => total + quant.quantity * quant.productWeight, 0),
    ownerId: directQuants.length > 0 && owners.size === 1 ? directQuants[0].ownerId : null,
  };
};

// The lots a move's lines take, in the order the lines first name them; a
// line with no lot or no quantity names none.
export const moveLotTotals = (lines: { lotId: string | null; lotName: string; quantity: number }[]): MoveLotTotal[] => {
  const totals = new Map<string, MoveLotTotal>();

  for (const line of lines) {
    if (line.lotId !== null && line.quantity !== 0) {
      const total = totals.get(line.lotId) ?? { lotId: line.lotId, name: line.lotName, quantity: 0 };

      totals.set(line.lotId, { ...total, quantity: total.quantity + line.quantity });
    }
  }
  return [...totals.values()];
};
