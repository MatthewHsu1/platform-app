// A non-empty string from a request body, else null.
export const optionalId = (value: unknown) => (typeof value === 'string' && value.length > 0 ? value : null);
