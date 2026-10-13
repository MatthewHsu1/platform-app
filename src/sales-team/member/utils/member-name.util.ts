export const memberName = (name: { firstName: string | null; lastName: string | null } | null): string | null => {
  const text = [name?.firstName, name?.lastName]
    .map((part) => (part ?? '').trim())
    .filter((part) => part !== '')
    .join(' ');

  return text === '' ? null : text;
};
