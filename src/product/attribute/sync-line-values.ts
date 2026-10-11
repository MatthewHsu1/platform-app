import { groupTemplateIds } from 'src/product/utils/group-template-ids.util';
import { isMergedAwayLine } from 'src/product/utils/merged-away-line.util';
import { planLinkMove } from 'src/product/utils/plan-link-move.util';
import { planTemplateAttributeValueSync } from 'src/product/utils/plan-template-attribute-value-sync.util';
import { isLiveTemplateAttributeValue } from 'src/product/utils/variant-plan-input.util';
import {
  ATTRIBUTE_VALUE_SELECTION,
  attributeLines,
  LINE_SELECTION,
  LINE_VALUE_LINK_SELECTION,
  lineValueLinks,
  productTemplates,
  TEMPLATE_ATTRIBUTE_VALUE_SELECTION,
  templateAttributeValues,
  variantCombinationLinks,
} from 'src/product/variant/product-records';
import { findMany, includingDeleted } from 'src/shared/triggers/records';
import { type ErrorCollector, retryOnConflict } from 'src/shared/triggers/retry-on-conflict';
import { DEFAULT_CURRENCY_CODE } from 'src/shared/currency.constant';
import { type AttributeValueRow } from 'src/product/variant/types/attribute-value-row.type';
import { type LineRow } from 'src/product/variant/types/line-row.type';
import { type LineValueLinkRow } from 'src/product/variant/types/line-value-link-row.type';
import { type TemplateAttributeValueRecord } from 'src/product/variant/types/template-attribute-value-record.type';

type LineRecord = LineRow & { deletedAt: string | null };

const LINE_RECORD_SELECTION = `${LINE_SELECTION} deletedAt`;

export const findLineIncludingDeleted = async (lineId: string) => {
  const [line] = await attributeLines.findIncludingDeleted<LineRecord>(
    { id: { eq: lineId } },
    LINE_RECORD_SELECTION,
  );
  return line;
};

// Syncs one attribute line. Returns the product to reconcile and the values it took
// off, which are deleted once no variant uses them.
const syncLine = async (lineId: string) => {
  const found = await findMany<{
    lines: LineRecord[];
    links: (LineValueLinkRow & { productAttributeValue: AttributeValueRow | null })[];
    records: TemplateAttributeValueRecord[];
  }>({
    lines: {
      of: attributeLines,
      filter: includingDeleted({ id: { eq: lineId } }),
      selection: LINE_RECORD_SELECTION,
    },
    links: {
      of: lineValueLinks,
      filter: { productTemplateAttributeLineId: { eq: lineId } },
      selection: `${LINE_VALUE_LINK_SELECTION} productAttributeValue { ${ATTRIBUTE_VALUE_SELECTION} }`,
    },
    records: {
      of: templateAttributeValues,
      filter: includingDeleted({ attributeLineId: { eq: lineId } }),
      selection: TEMPLATE_ATTRIBUTE_VALUE_SELECTION,
    },
  });
  const [line] = found.lines;

  if (line === undefined || line.productTmplId === null) {
    return null;
  }

  const lineActive = line.active && line.deletedAt === null;
  const valueById = new Map(
    found.links.flatMap((link) =>
      link.productAttributeValue === null
        ? []
        : [[link.productAttributeValue.id, link.productAttributeValue] as const],
    ),
  );
  const plan = planTemplateAttributeValueSync({
    line: { id: lineId, active: lineActive, valueIds: [...valueById.keys()] },
    templateAttributeValues: found.records.map((record) => ({
      id: record.id,
      valueId: record.productAttributeValueId ?? '',
      ptavActive: isLiveTemplateAttributeValue(record),
    })),
    defaultExtraPriceByValue: new Map(
      [...valueById.values()].map((value) => [value.id, value.defaultExtraPrice?.amountMicros ?? 0]),
    ),
  });
  const recordById = new Map(found.records.map((record) => [record.id, record]));

  await templateAttributeValues.createMany(
    plan.create.map(({ valueId, priceExtra }) => ({
      productAttributeValueId: valueId,
      attributeLineId: lineId,
      productTmplId: line.productTmplId,
      ptavActive: true,
      priceExtra: {
        amountMicros: priceExtra,
        currencyCode:
          valueById.get(valueId)?.defaultExtraPrice?.currencyCode ?? DEFAULT_CURRENCY_CODE,
      },
    })),
  );
  await templateAttributeValues.restoreMany(
    plan.reactivate.filter((id) => recordById.get(id)?.deletedAt !== null),
  );
  await templateAttributeValues.updateMany(
    plan.reactivate.filter((id) => recordById.get(id)?.ptavActive !== true),
    { ptavActive: true },
  );
  await templateAttributeValues.updateMany(plan.removeOrArchive, { ptavActive: false });

  return { templateId: line.productTmplId, removed: plan.removeOrArchive };
};

export const syncLineValues = async (lineIds: string[], errors: ErrorCollector) => {
  const results: { templateId: string; removed: string[] }[] = [];

  for (const lineId of [...new Set(lineIds)]) {
    await errors.run(lineId, async () => {
      const result = await retryOnConflict(() => syncLine(lineId));

      if (result !== null) {
        results.push(result);
      }
    });
  }

  return {
    templateIds: groupTemplateIds(results, (result) => result.templateId),
    removed: results.flatMap((result) => result.removed),
  };
};

// Archiving a line clears its values.
// Only the values the line held when it was archived: a value put on it
// afterwards (moved there by a merge, or added again) stays.
export const clearLineValues = async (lineId: string, archivedAt: string) => {
  const links = await lineValueLinks.find<{ id: string }>(
    { productTemplateAttributeLineId: { eq: lineId }, updatedAt: { lte: archivedAt } },
    'id',
  );
  await lineValueLinks.destroyMany(links.map((link) => link.id));
};

// Puts value links on another line; a value that line already has from
// another link is dropped. Reads the links again first: the merge and the
// link trigger may both be moving the same link.
const moveLinks = async (linkIds: string[], targetLineId: string) => {
  if (linkIds.length === 0) {
    return;
  }
  // One list: Twenty refuses the same list twice in one request.
  const rows = await lineValueLinks.find<LineValueLinkRow>(
    { or: [{ id: { in: linkIds } }, { productTemplateAttributeLineId: { eq: targetLineId } }] },
    LINE_VALUE_LINK_SELECTION,
  );
  const found = {
    moving: rows.filter((row) => linkIds.includes(row.id)),
    targetLinks: rows.filter((row) => row.productTemplateAttributeLineId === targetLineId),
  };
  const plan = planLinkMove({ ...found, targetLineId });

  await lineValueLinks.destroyMany(plan.destroy);
  for (const linkId of plan.move) {
    try {
      await lineValueLinks.update(linkId, { productTemplateAttributeLineId: targetLineId });
    } catch (error) {
      // Gone already (another run dropped it as a duplicate): nothing to move.
      if (!(error instanceof Error && error.message.includes('Record not found'))) {
        throw error;
      }
    }
  }
};

// A product attribute value that left its line is deleted unless a variant
// still holds it; then it stays archived. Runs after the variants are
// reconciled, so only archived variants still hold one.
export const removeUnusedTemplateAttributeValues = async (templateAttributeValueIds: string[]) => {
  if (templateAttributeValueIds.length === 0) {
    return;
  }
  // The variant reads as null when it is soft-deleted.
  const links = await variantCombinationLinks.find<{
    productTemplateAttributeValueId: string | null;
    productProduct: { id: string } | null;
  }>(
    { productTemplateAttributeValueId: { in: templateAttributeValueIds } },
    'productTemplateAttributeValueId productProduct { id }',
  );
  const used = new Set(
    links.flatMap((link) =>
      link.productProduct === null ? [] : (link.productTemplateAttributeValueId ?? []),
    ),
  );

  await templateAttributeValues.softDeleteMany(
    templateAttributeValueIds.filter((id) => !used.has(id)),
  );
};

const isTemplateDeleted = async (templateId: string) => {
  const [template] = await productTemplates.findIncludingDeleted<{ deletedAt: string | null }>(
    { id: { eq: templateId } },
    'deletedAt',
  );
  return template !== undefined && template.deletedAt !== null;
};

// A line that cannot be deleted because a variant still holds one of
// its values is archived.
export const archiveDeletedLineInUse = async (lineId: string) => {
  const line = await findLineIncludingDeleted(lineId);

  if (line === undefined || line.deletedAt === null) {
    return;
  }
  // A line deleted with its product goes with it.
  if (line.productTmplId !== null && (await isTemplateDeleted(line.productTmplId))) {
    return;
  }
  const remaining = await templateAttributeValues.find<{ id: string }>(
    { attributeLineId: { eq: lineId } },
    'id',
  );

  if (remaining.length === 0) {
    return;
  }
  await attributeLines.restore(lineId);
  if (line.active) {
    await attributeLines.update(lineId, { active: false });
  }
};

const findSameAttributeLine = async (
  line: { id: string; productTmplId: string; attributeId: string },
  filter: Record<string, unknown> = {},
) => {
  const [found] = await attributeLines.find<LineRow>(
    {
      productTmplId: { eq: line.productTmplId },
      attributeId: { eq: line.attributeId },
      id: { neq: line.id },
      ...filter,
    },
    LINE_SELECTION,
  );
  return found;
};

// The merge marks the line it takes out by archiving it before the delete.
export const isMergedAway = async (line: LineRecord | undefined) => {
  if (line === undefined || line.productTmplId === null || line.attributeId === null) {
    return false;
  }
  const others = await attributeLines.find<LineRow & { deletedAt: string | null }>(
    {
      productTmplId: { eq: line.productTmplId },
      attributeId: { eq: line.attributeId },
      id: { neq: line.id },
    },
    LINE_RECORD_SELECTION,
  );
  return isMergedAwayLine(line, others);
};

// Creating a line: a product and attribute that already have an archived
// line get that line back with the new values, so its old variants return.
// Returns the line that stays.
export const mergeIntoArchivedLine = async (line: {
  id: string;
  productTmplId: string;
  attributeId: string;
}) => {
  const archived = await findSameAttributeLine(line, { active: { eq: false } });

  if (archived === undefined) {
    return line.id;
  }

  await attributeLines.update(archived.id, { active: true });
  await attributeLines.update(line.id, { active: false });
  await attributeLines.softDelete(line.id);
  await moveLinks(
    (
      await lineValueLinks.find<{ id: string }>(
        { productTemplateAttributeLineId: { eq: line.id } },
        'id',
      )
    ).map((link) => link.id),
    archived.id,
  );

  return archived.id;
};

// A value picked on a line that was just merged into an archived one belongs
// to the line that stays (the new line's values are written onto it).
// Returns the line the link is on now.
export const moveLinkOffMergedLine = async (link: LineValueLinkRow) => {
  const lineId = link.productTemplateAttributeLineId;
  const line = lineId === null ? undefined : await findLineIncludingDeleted(lineId);

  if (
    line === undefined ||
    line.deletedAt === null ||
    line.productTmplId === null ||
    line.attributeId === null
  ) {
    return lineId;
  }
  const survivor = await findSameAttributeLine({
    id: line.id,
    productTmplId: line.productTmplId,
    attributeId: line.attributeId,
  });

  if (survivor === undefined) {
    return lineId;
  }
  await moveLinks([link.id], survivor.id);
  return survivor.id;
};
