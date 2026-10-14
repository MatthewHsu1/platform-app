// A stored value counts as set unless it is empty: no value, empty text, zero, false, an empty list, or a
// composite value (rich text) whose parts are all empty.
export const isFieldSet = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value !== '';
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Object.values(value).some(isFieldSet);
};
