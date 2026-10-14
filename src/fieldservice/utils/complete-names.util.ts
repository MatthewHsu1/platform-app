const isWritten = (value: string | null): value is string =>
  value !== null && value.trim() !== '';

// The display name prefixes the reference in brackets and nests under the
// parent chain, so a child reads as its parent plus its own labelled name.
export const completeName = (
  parentCompleteName: string | null,
  ref: string | null,
  name: string,
): string => {
  const labelledName = isWritten(ref) ? `[${ref}] ${name}` : name;
  return isWritten(parentCompleteName) ? `${parentCompleteName} / ${labelledName}` : labelledName;
};

// Directions accumulate down the chain, joined with a semicolon separator.
export const completeDirection = (
  parentCompleteDirection: string | null,
  direction: string | null,
): string | null => {
  if (isWritten(parentCompleteDirection) && isWritten(direction)) {
    return `${parentCompleteDirection}; ${direction}`;
  }
  if (isWritten(parentCompleteDirection)) {
    return parentCompleteDirection;
  }
  if (isWritten(direction)) {
    return direction;
  }
  return null;
};
