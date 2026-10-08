import { combinationKey } from 'src/product/utils/plan-variants.util';
import {
  isLiveTemplateAttributeValue,
  variantCombinations,
} from 'src/product/utils/variant-plan-input.util';
import { type VariantNameValue, variantDisplayName } from 'src/product/utils/variant-display-name.util';
import {
  type TemplateAttributeValueRecord,
  type TemplateState,
} from 'src/product/variant/template-state.type';
import { DEFAULT_CURRENCY_CODE } from 'src/shared/currency.constant';
import { sameValue } from 'src/shared/utils/same-value.util';

type Change = { id: string; data: Record<string, unknown> };


const changed = (id: string, data: Record<string, unknown>): Change[] =>
  Object.keys(data).length > 0 ? [{ id, data }] : [];

const detailsContext = (state: TemplateState) => {
  const templateAttributeValueById = new Map(
    [...state.otherTemplateAttributeValues, ...state.templateAttributeValues].map(
      (templateAttributeValue) => [templateAttributeValue.id, templateAttributeValue],
    ),
  );
  const lineById = new Map(state.lines.map((line) => [line.id, line]));
  const valueName = (templateAttributeValueId: string | null) => {
    const record =
      templateAttributeValueId === null
        ? undefined
        : templateAttributeValueById.get(templateAttributeValueId);
    return record?.productAttributeValueId
      ? (state.attributeValues.get(record.productAttributeValueId)?.name ?? '')
      : '';
  };
  const attributeOfLine = (lineId: string | null) => {
    const attributeId = lineId === null ? null : (lineById.get(lineId)?.attributeId ?? null);
    return attributeId === null ? undefined : state.attributes.get(attributeId);
  };

  const lineValueCounts = new Map<string, { active: number; total: number }>();
  for (const record of state.templateAttributeValues) {
    if (record.attributeLineId === null || record.deletedAt !== null) {
      continue;
    }
    const counts = lineValueCounts.get(record.attributeLineId) ?? { active: 0, total: 0 };
    counts.total += 1;
    counts.active += record.ptavActive ? 1 : 0;
    lineValueCounts.set(record.attributeLineId, counts);
  }

  const nameValue = (record: TemplateAttributeValueRecord): VariantNameValue => {
    const line = record.attributeLineId === null ? undefined : lineById.get(record.attributeLineId);
    const attribute = attributeOfLine(record.attributeLineId);
    const value =
      record.productAttributeValueId === null
        ? undefined
        : state.attributeValues.get(record.productAttributeValueId);
    const counts = lineValueCounts.get(record.attributeLineId ?? '') ?? { active: 0, total: 0 };

    return {
      name: value?.name ?? '',
      isActive: isLiveTemplateAttributeValue(record),
      lineId: record.attributeLineId ?? '',
      lineSequence: line?.sequence ?? 0,
      attributeSequence: attribute?.sequence ?? 0,
      attributeId: attribute?.id ?? '',
      valueSequence: value?.sequence ?? 0,
      lineCreateVariant: attribute?.createVariant ?? 'ALWAYS',
      lineActiveValueCount: counts.active,
      lineTotalValueCount: counts.total,
    };
  };

  const currencyCode = state.template.listPrice?.currencyCode ?? DEFAULT_CURRENCY_CODE;
  const listPriceMicros = state.template.listPrice?.amountMicros ?? 0;

  // Display name, extra price and sale price of a variant holding these
  // product attribute values.
  const variantDetails = (templateAttributeValueIds: string[], defaultCode: string | null) => {
    const records = templateAttributeValueIds.flatMap((id) => {
      const record = templateAttributeValueById.get(id);
      return record === undefined ? [] : [record];
    });
    const priceExtraMicros = records.reduce(
      (sum, record) => sum + (record.priceExtra?.amountMicros ?? 0),
      0,
    );

    return {
      name: variantDisplayName({
        templateName: state.template.name ?? '',
        defaultCode,
        templateAttributeValues: records.map(nameValue),
      }),
      priceExtra: { amountMicros: priceExtraMicros, currencyCode },
      lstPrice: { amountMicros: listPriceMicros + priceExtraMicros, currencyCode },
      combinationIndices: combinationKey(templateAttributeValueIds),
    };
  };

  return { templateAttributeValueById, valueName, attributeOfLine, nameValue, variantDetails };
};

export const variantDetailsFor = (state: TemplateState) => detailsContext(state).variantDetails;

// Computed names and prices: variant display name, extra price and sale
// price; the line, product attribute value and exclusion labels.
// Returns only the fields whose stored value differs.
export const planVariantDetails = (state: TemplateState) => {
  const { templateAttributeValueById, valueName, attributeOfLine, nameValue, variantDetails } =
    detailsContext(state);
  const combinations = variantCombinations(state);

  const variants = state.variants
    .filter((variant) => variant.deletedAt === null)
    .flatMap((variant) => {
      const wanted = variantDetails(combinations.get(variant.id) ?? [], variant.defaultCode);
      const data: Record<string, unknown> = {};

      if (variant.name !== wanted.name) {
        data.name = wanted.name;
      }
      if (!sameValue(variant.priceExtra, wanted.priceExtra)) {
        data.priceExtra = wanted.priceExtra;
      }
      if (!sameValue(variant.lstPrice, wanted.lstPrice)) {
        data.lstPrice = wanted.lstPrice;
      }
      if ((variant.combinationIndices ?? '') !== wanted.combinationIndices) {
        data.combinationIndices = wanted.combinationIndices;
      }

      return changed(variant.id, data);
    });

  const lines = state.lines.flatMap((line) => {
    const name = attributeOfLine(line.id)?.name ?? '';
    const valueCount = state.lineValueLinks.filter(
      (link) => link.productTemplateAttributeLineId === line.id,
    ).length;
    const data: Record<string, unknown> = {};

    if (line.name !== name) {
      data.name = name;
    }
    if (line.valueCount !== valueCount) {
      data.valueCount = valueCount;
    }

    return changed(line.id, data);
  });

  const templateAttributeValues = state.templateAttributeValues
    .filter((record) => record.deletedAt === null)
    .flatMap((record) => {
      const attribute = attributeOfLine(record.attributeLineId);
      if (attribute === undefined) {
        return [];
      }
      const name = `${attribute.name ?? ''}: ${valueName(record.id)}`;
      return record.name === name ? [] : [{ id: record.id, data: { name } }];
    });

  const exclusions = state.exclusions
    .filter((exclusion) => exclusion.productTmplId === state.template.id)
    .flatMap((exclusion) => {
      const excluded = state.exclusionLinks
        .filter((link) => link.productTemplateAttributeExclusionId === exclusion.id)
        .map((link) => link.productTemplateAttributeValueId)
        .sort((a, b) => {
          const recordA = a === null ? undefined : templateAttributeValueById.get(a);
          const recordB = b === null ? undefined : templateAttributeValueById.get(b);
          const sequenceA = recordA === undefined ? 0 : nameValue(recordA).valueSequence;
          const sequenceB = recordB === undefined ? 0 : nameValue(recordB).valueSequence;
          return sequenceA - sequenceB || (a ?? '').localeCompare(b ?? '');
        })
        .map(valueName);
      const source = valueName(exclusion.productTemplateAttributeValueId);
      const name = excluded.length > 0 ? `${source} excludes ${excluded.join(', ')}` : source;

      return exclusion.name === name ? [] : [{ id: exclusion.id, data: { name } }];
    });

  return { variants, lines, templateAttributeValues, exclusions };
};
