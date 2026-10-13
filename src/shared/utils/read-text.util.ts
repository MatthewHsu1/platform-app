// A request value that is a non-empty string, else null.
export const readText = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : null);
