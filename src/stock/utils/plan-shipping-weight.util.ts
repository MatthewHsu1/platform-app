import { packageDestinationDescendants } from 'src/stock/utils/plan-package-rules.util';
import { outermostPackage } from 'src/stock/utils/plan-put-in-pack.util';

type WeightLine = { resultPackageId: string | null; quantityProductUom: number; productWeight: number };
type WeightPackage = { id: string; packageDestId: string | null; baseWeight: number; shippingWeight: number };

const EPSILON = 1e-9;

// Float sums like 0.1 + 0.2 would otherwise read as a changed weight.
const round = (value: number) => Number(value.toPrecision(15));

// The weight of the lines without a package, plus each outermost package the
// lines go into: its typed shipping weight, else its type's weight and its
// content, with every package headed into it and their content.
export const planShippingWeight = ({ lines, packages }: { lines: WeightLine[]; packages: WeightPackage[] }) => {
  const contentOf = (packageId: string | null) =>
    lines
      .filter((line) => line.resultPackageId === packageId)
      .reduce((sum, line) => sum + line.quantityProductUom * line.productWeight, 0);
  const byId = new Map(packages.map((pack) => [pack.id, pack]));
  const outermost = [
    ...new Set(lines.flatMap((line) => (line.resultPackageId === null ? [] : [outermostPackage(line.resultPackageId, packages)]))),
  ];
  let weight = contentOf(null);

  for (const packageId of outermost) {
    const typed = byId.get(packageId)?.shippingWeight ?? 0;

    if (typed !== 0) {
      weight += typed;
      continue;
    }
    for (const id of packageDestinationDescendants(packageId, packages)) {
      weight += (byId.get(id)?.baseWeight ?? 0) + contentOf(id);
    }
  }
  return round(weight);
};

// The transfer's weight is written only when the computed weight moved away
// from the last one written, so a weight a user typed stays until something
// the weight depends on changes.
export const planShippingWeightWrite = ({
  computed,
  storedComputed,
  storedShippingWeight,
}: {
  computed: number;
  storedComputed: number | null;
  storedShippingWeight: number | null;
}): { shippingWeight?: number; shippingWeightComputed?: number } =>
  storedComputed !== null && Math.abs(computed - storedComputed) < EPSILON && storedShippingWeight !== null
    ? {}
    : { shippingWeight: computed, shippingWeightComputed: computed };
