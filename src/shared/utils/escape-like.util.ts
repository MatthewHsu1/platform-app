// A % or _ the user types is a plain character in an ilike pattern, not a wildcard.
export const escapeLike = (text: string) => text.replace(/[\\%_]/g, (character) => `\\${character}`);
