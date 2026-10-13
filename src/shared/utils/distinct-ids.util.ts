// The ids that are set, each once, in the order first seen.
export const distinctIds = (values: (string | null | undefined)[]): string[] => [
  ...new Set(values.flatMap((value) => (value === null || value === undefined ? [] : [value]))),
];
