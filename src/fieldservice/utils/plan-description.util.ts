const hasText = (value: string | null) => value !== null && value.trim() !== '';

// An order without a description takes the notes of its equipment, one after the other. A written description
// stays; null means nothing to write.
export const planDescription = (description: string | null, equipmentNotes: (string | null)[]): string | null => {
  if (hasText(description)) {
    return null;
  }
  const notes = equipmentNotes.filter(hasText);

  return notes.length === 0 ? null : notes.join('\n\n');
};
