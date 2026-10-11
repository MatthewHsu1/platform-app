type TemplateAttributeValueRow = { id: string; valueId: string; ptavActive: boolean };

// One product attribute value
// per value on the line. An archived line offers no values.
export const planTemplateAttributeValueSync = ({
  line,
  templateAttributeValues,
  defaultExtraPriceByValue,
}: {
  line: { id: string; active: boolean; valueIds: string[] };
  templateAttributeValues: TemplateAttributeValueRow[];
  defaultExtraPriceByValue: Map<string, number>;
}) => {
  const wanted = new Set(line.active ? line.valueIds : []);
  const byValue = new Map(
    templateAttributeValues.map((templateAttributeValue) => [
      templateAttributeValue.valueId,
      templateAttributeValue,
    ]),
  );

  return {
    create: [...wanted]
      .filter((valueId) => !byValue.has(valueId))
      .map((valueId) => ({ valueId, priceExtra: defaultExtraPriceByValue.get(valueId) ?? 0 })),
    reactivate: templateAttributeValues
      .filter(
        (templateAttributeValue) =>
          wanted.has(templateAttributeValue.valueId) && !templateAttributeValue.ptavActive,
      )
      .map((templateAttributeValue) => templateAttributeValue.id),
    removeOrArchive: templateAttributeValues
      .filter(
        (templateAttributeValue) =>
          !wanted.has(templateAttributeValue.valueId) && templateAttributeValue.ptavActive,
      )
      .map((templateAttributeValue) => templateAttributeValue.id),
  };
};
