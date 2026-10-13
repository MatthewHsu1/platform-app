// Today's date (YYYY-MM-DD) where the person is, not in UTC.
export const localToday = () => {
  const now = new Date();

  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
