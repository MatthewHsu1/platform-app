const hasConditions = (query: unknown) =>
  query !== null &&
  typeof query === 'object' &&
  Array.isArray((query as { rules?: unknown[] }).rules) &&
  (query as { rules: unknown[] }).rules.length > 0;

// The stored text for a query: an empty query is no filter.
export const filterText = (query: unknown) => (hasConditions(query) ? JSON.stringify(query) : null);

// The stored filter as the editor reads it. Text that is not a query opens
// as an empty editor and is marked, so the user knows a save replaces it.
export const parseStoredFilter = (text: string | null): { value: unknown; unreadable: boolean } => {
  if (text === null || text.trim() === '') {
    return { value: null, unreadable: false };
  }
  try {
    return { value: JSON.parse(text) as unknown, unreadable: false };
  } catch {
    return { value: null, unreadable: true };
  }
};

// Whether a stored filter limits anything. Unreadable text counts: using it
// reports why it cannot run.
export const storedFilterHasConditions = (text: string | null) => {
  const { value, unreadable } = parseStoredFilter(text);

  return unreadable || hasConditions(value);
};
