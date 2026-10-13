const DAY_MS = 86_400_000;

export const withoutMilliseconds = (iso: string) => {
  const time = new Date(iso);

  time.setUTCMilliseconds(0);

  return time.toISOString();
};

// Whole days from one time to the other: the gap is rounded down to whole
// days first, then made positive.
export const wholeDaysBetween = (from: string | null, to: string | null) => {
  if (from === null || to === null) {
    return null;
  }

  return Math.abs(Math.floor((Date.parse(to) - Date.parse(from)) / DAY_MS));
};
