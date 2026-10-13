export const compareText = (left: string, right: string) => (left < right ? -1 : left > right ? 1 : 0);

// A missing incoming date sorts after every date, as the database sorts an
// empty value last in ascending order (and so first in descending order).
export const compareInDate = (left: { inDate: string | null }, right: { inDate: string | null }) => {
  if (left.inDate === null || right.inDate === null) {
    return Number(left.inDate === null) - Number(right.inDate === null);
  }

  return compareText(left.inDate, right.inDate);
};

type Created = { id: string; createdAt?: string | null };

export const compareCreation = (left: Created, right: Created) =>
  compareText(left.createdAt ?? '', right.createdAt ?? '') || compareText(left.id, right.id);
