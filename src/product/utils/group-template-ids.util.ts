// A bulk import sends many events in one batch; each product is reconciled once.
export const groupTemplateIds = <TEvent>(
  events: TEvent[],
  readTemplateId: (event: TEvent) => string | null | undefined,
) => {
  const templateIds: string[] = [];
  const seen = new Set<string>();

  for (const event of events) {
    const templateId = readTemplateId(event);

    if (templateId === null || templateId === undefined || seen.has(templateId)) {
      continue;
    }
    seen.add(templateId);
    templateIds.push(templateId);
  }

  return templateIds;
};
