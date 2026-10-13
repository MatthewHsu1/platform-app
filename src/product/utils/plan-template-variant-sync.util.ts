import { isApplicationWrite } from 'src/shared/triggers/actor';
import { sameValue } from 'src/shared/utils/same-value.util';
import { type SyncedField } from 'src/product/utils/types/synced-field.type';
import { type SyncValues } from 'src/product/utils/types/sync-values.type';

type SyncRow = {
  defaultCode: string | null;
  barcode: string | null;
  standardPrice: { amountMicros: number | null } | null;
  weight: number | null;
  volume: number | null;
};

// Twenty stores an empty text as '' and
// an empty cost as 0 or no amount, so each of these reads as no value here.
export const syncValuesOf = (row: SyncRow): SyncValues => ({
  defaultCode: row.defaultCode || null,
  barcode: row.barcode || null,
  standardPrice: row.standardPrice?.amountMicros || null,
  weight: row.weight ?? null,
  volume: row.volume ?? null,
});

export const SYNCED_FIELDS: SyncedField[] = ['defaultCode', 'barcode', 'standardPrice', 'weight', 'volume'];

const singleVariant = <TVariant extends { active: boolean }>(variants: TVariant[]) => {
  const active = variants.filter((variant) => variant.active);
  const candidates = active.length > 0 ? active : variants;
  return candidates.length === 1 ? candidates[0] : null;
};

// With two or more variants the product shows no value.
const clearedFields = (template: SyncValues, fields: SyncedField[]) => {
  const data: Partial<SyncValues> = {};
  for (const field of fields) {
    if (template[field] !== null && template[field] !== undefined) {
      data[field] = null;
    }
  }
  return data;
};

// These show on the product only while it has exactly one variant
// (active first, else the one archived), and writes them through to it.
export const planTemplateVariantSync = ({
  source,
  changedFields,
  template,
  variants,
}: {
  source: 'template' | 'variant';
  changedFields: SyncedField[];
  template: SyncValues;
  variants: ({ id: string; active: boolean } & SyncValues)[];
}) => {
  const single = singleVariant(variants);
  const templateData: Partial<SyncValues> = {};

  if (single === null) {
    return { template: clearedFields(template, changedFields), variant: null };
  }

  const variantData: Partial<SyncValues> = {};
  for (const field of changedFields) {
    if (sameValue(template[field], single[field])) {
      continue;
    }
    if (source === 'template') {
      variantData[field] = template[field];
    } else {
      templateData[field] = single[field];
    }
  }

  return {
    template: templateData,
    variant: Object.keys(variantData).length > 0 ? { id: single.id, data: variantData } : null,
  };
};

type Saved = { updatedAt: string };

// A staff save on one side. Per field: the other side still holding the
// old value takes the new one; the other side holding a third value was saved
// too, and the later save wins on both sides, as saves apply in order.
export const planEditSync = ({
  source,
  edits,
  sourceSavedAt,
  template,
  variants,
}: {
  source: 'template' | 'variant';
  edits: Partial<Record<SyncedField, { before: unknown; after: unknown }>>;
  sourceSavedAt: string;
  template: SyncValues & Saved;
  variants: ({ id: string; active: boolean } & SyncValues & Saved)[];
}) => {
  const fields = Object.keys(edits) as SyncedField[];
  const single = singleVariant(variants);

  if (single === null) {
    return { template: clearedFields(template, fields), variant: null };
  }

  const own = source === 'template' ? template : single;
  const other = source === 'template' ? single : template;
  const ownData: Partial<SyncValues> = {};
  const otherData: Partial<SyncValues> = {};

  for (const field of fields) {
    const { before, after } = edits[field] as { before: unknown; after: unknown };

    if (sameValue(other[field], after)) {
      continue;
    }
    if (sameValue(other[field], before)) {
      otherData[field] = after;
    } else if (sourceSavedAt >= other.updatedAt) {
      if (!sameValue(other[field], own[field])) {
        otherData[field] = own[field];
      }
    } else if (!sameValue(own[field], other[field])) {
      ownData[field] = other[field];
    }
  }

  const templateData = source === 'template' ? ownData : otherData;
  const variantData = source === 'template' ? otherData : ownData;

  return {
    template: templateData,
    variant: Object.keys(variantData).length > 0 ? { id: single.id, data: variantData } : null,
  };
};

type SavedRow = SyncRow & {
  updatedAt?: string;
  updatedBy?: { source?: string | null } | null;
};

// The staff saves of one side in a batch, per field: the value before the
// first save and after the last one. The app's own copies are left out.
export const staffEditOf = <TRow extends SavedRow>(
  source: 'template' | 'variant',
  changes: { before: TRow; after: TRow }[],
) => {
  const staff = changes.filter(({ after }) => !isApplicationWrite(after));
  const edits: Partial<Record<SyncedField, { before: unknown; after: unknown }>> = {};

  for (const { before, after } of staff) {
    const beforeValues = syncValuesOf(before);
    const afterValues = syncValuesOf(after);
    for (const field of SYNCED_FIELDS) {
      if (!sameValue(beforeValues[field], afterValues[field])) {
        edits[field] = {
          before: field in edits ? edits[field]?.before : beforeValues[field],
          after: afterValues[field],
        };
      }
    }
  }

  const last = staff[staff.length - 1]?.after;
  return Object.keys(edits).length === 0 || last === undefined
    ? null
    : { source, edits, savedAt: last.updatedAt ?? '' };
};

// After variants are reconciled the product follows its variant, except on the fields a staff save
// in the same run changed: that save already went to the variant, before the
// variants are reconciled.
export const fieldsNotEdited = (edit: { edits: Partial<Record<SyncedField, unknown>> } | undefined) =>
  SYNCED_FIELDS.filter((field) => edit === undefined || !(field in edit.edits));
