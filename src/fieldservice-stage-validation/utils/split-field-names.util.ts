// The names a rule row lists in "Other fields": separated by commas, semicolons or spaces, each once.
export const splitFieldNames = (text: string | null): string[] => [
  ...new Set((text ?? '').split(/[\s,;]+/).filter((name) => name !== '')),
];
