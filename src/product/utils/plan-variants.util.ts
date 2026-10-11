import { type VariantLine } from 'src/product/utils/types/variant-line.type';
import { type VariantExclusion } from 'src/product/utils/types/variant-exclusion.type';
import { type ExistingVariant } from 'src/product/utils/types/existing-variant.type';
import { type VariantPlan } from 'src/product/utils/types/variant-plan.type';

const DEFAULT_LIMIT = 1000;

export const combinationKey = (templateAttributeValueIds: string[]) =>
  [...templateAttributeValueIds].sort().join(',');

function* cartesian(lists: string[][]): Generator<string[]> {
  if (lists.length === 0) {
    yield [];
    return;
  }
  const [first, ...rest] = lists;
  for (const head of first) {
    for (const tail of cartesian(rest)) {
      yield [head, ...tail];
    }
  }
}

export const planVariants = ({
  templateActive,
  lines: allLines,
  exclusions,
  variants,
  limit = DEFAULT_LIMIT,
}: {
  templateActive: boolean;
  lines: VariantLine[];
  exclusions: VariantExclusion[];
  variants: ExistingVariant[];
  limit?: number;
}): VariantPlan => {
  const lines = allLines
    .filter(
      (line) => line.createVariant !== 'NO_VARIANT' && line.templateAttributeValueIds.length > 0,
    )
    .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
  const lineOfTemplateAttributeValue = new Map(
    lines.flatMap((line) =>
      line.templateAttributeValueIds.map(
        (templateAttributeValueId) => [templateAttributeValueId, line.id] as const,
      ),
    ),
  );
  const excluded = new Map<string, Set<string>>();
  for (const { sourceTemplateAttributeValueId, excludedTemplateAttributeValueIds } of exclusions) {
    const set = excluded.get(sourceTemplateAttributeValueId) ?? new Set<string>();
    excludedTemplateAttributeValueIds.forEach((templateAttributeValueId) =>
      set.add(templateAttributeValueId),
    );
    excluded.set(sourceTemplateAttributeValueId, set);
  }

  // A valid combination has one active value per
  // line, every line covered, no pair excluded either way.
  const isValid = (combination: string[]) => {
    const coveredLines = combination.map((templateAttributeValueId) =>
      lineOfTemplateAttributeValue.get(templateAttributeValueId),
    );
    if (coveredLines.some((lineId) => lineId === undefined)) {
      return false;
    }
    if (new Set(coveredLines).size !== combination.length || combination.length !== lines.length) {
      return false;
    }
    return combination.every((a) => combination.every((b) => !excluded.get(a)?.has(b)));
  };

  // A single-value line is merged into an existing variant when the union
  // covers every line exactly once. It checks neither exclusions nor whether
  // the variant's own values are still active.
  const lineOfAnyValue = new Map(
    lines.flatMap((line) =>
      [...line.templateAttributeValueIds, ...line.inactiveTemplateAttributeValueIds].map(
        (templateAttributeValueId) => [templateAttributeValueId, line.id] as const,
      ),
    ),
  );
  const coversEveryLineOnce = (combination: string[]) => {
    const coveredLines = combination.map((templateAttributeValueId) =>
      lineOfAnyValue.get(templateAttributeValueId),
    );
    return (
      !coveredLines.includes(undefined) &&
      new Set(coveredLines).size === lines.length &&
      combination.length === lines.length
    );
  };

  const working = variants.map((variant) => ({
    ...variant,
    templateAttributeValueIds: [...variant.templateAttributeValueIds],
  }));
  const extend: { variantId: string; templateAttributeValueIds: string[] }[] = [];
  const singleValueTemplateAttributeValues = lines
    .filter((line) => line.templateAttributeValueIds.length === 1)
    .map((line) => line.templateAttributeValueIds[0]);

  for (const variant of working) {
    const additions = singleValueTemplateAttributeValues.filter(
      (templateAttributeValueId) =>
        !variant.templateAttributeValueIds.includes(templateAttributeValueId),
    );
    const candidate = [...variant.templateAttributeValueIds, ...additions];
    if (additions.length > 0 && coversEveryLineOnce(candidate)) {
      variant.templateAttributeValueIds = candidate;
      extend.push({ variantId: variant.id, templateAttributeValueIds: candidate });
    }
  }

  const byKey = new Map(
    working.map((variant) => [combinationKey(variant.templateAttributeValueIds), variant]),
  );
  const keep = new Set<string>();
  const create: string[][] = [];
  const hasDynamic = lines.some((line) => line.createVariant === 'DYNAMIC');

  if (hasDynamic) {
    for (const variant of working) {
      if (isValid(variant.templateAttributeValueIds)) {
        keep.add(variant.id);
      }
    }
  } else {
    let count = 0;
    for (const combination of cartesian(lines.map((line) => line.templateAttributeValueIds))) {
      if (!isValid(combination)) {
        continue;
      }
      const existing = byKey.get(combinationKey(combination));
      if (existing !== undefined) {
        keep.add(existing.id);
        continue;
      }
      count += 1;
      if (count > limit) {
        return {
          kind: 'refuse',
          reason: `This would make more than ${limit} new variants. The limit is ${limit} new variants at a time.`,
        };
      }
      create.push(combination);
    }
  }

  return {
    kind: 'apply',
    create,
    activate: templateActive
      ? working
          .filter((variant) => keep.has(variant.id) && !variant.active)
          .map((variant) => variant.id)
      : [],
    extend,
    removeOrArchive: working
      .filter((variant) => !keep.has(variant.id))
      .map((variant) => variant.id),
  };
};
