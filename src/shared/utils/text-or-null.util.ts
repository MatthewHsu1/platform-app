// Twenty's API answers "" for a TEXT field whose column is NULL; code reads both as no value.
export const textOrNull = (value: string | null | undefined): string | null =>
  value === undefined || value === '' ? null : value;
