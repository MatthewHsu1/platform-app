// A calendar day ("2026-10-08", or the day of an ISO date-time) written the way the person's language writes dates.
// The day is read in UTC, so no time zone moves it to the day before or after.
export const formatDay = (day: string, locale: string) => {
  const date = new Date(`${day.slice(0, 10)}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return day;
  }
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
  } catch {
    return day.slice(0, 10);
  }
};
