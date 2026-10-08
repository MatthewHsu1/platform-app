import { type CreateVariantMode } from 'src/product/utils/plan-variants.util';

export type VariantNameValue = {
  name: string;
  isActive: boolean;
  lineId: string;
  lineSequence: number;
  attributeSequence: number;
  attributeId: string;
  valueSequence: number;
  lineCreateVariant: CreateVariantMode;
  lineActiveValueCount: number;
  lineTotalValueCount: number;
};

export const variantDisplayName = ({
  templateName,
  defaultCode,
  templateAttributeValues,
}: {
  templateName: string;
  defaultCode: string | null;
  templateAttributeValues: VariantNameValue[];
}) => {
  // Archived values count too when the combination holds one, so an old
  // variant keeps the name it had.
  const holdsArchivedValue = templateAttributeValues.some((value) => !value.isActive);
  const shown = templateAttributeValues
    .filter(
      (value) =>
        value.lineCreateVariant !== 'NO_VARIANT' &&
        (holdsArchivedValue ? value.lineTotalValueCount : value.lineActiveValueCount) > 1,
    )
    .sort(
      (a, b) =>
        a.lineSequence - b.lineSequence ||
        a.attributeSequence - b.attributeSequence ||
        a.attributeId.localeCompare(b.attributeId) ||
        a.lineId.localeCompare(b.lineId) ||
        a.valueSequence - b.valueSequence,
    )
    .map((value) => value.name);
  const name = shown.length > 0 ? `${templateName} (${shown.join(', ')})` : templateName;

  return defaultCode ? `[${defaultCode}] ${name}` : name;
};
