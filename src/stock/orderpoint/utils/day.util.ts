// Days are UTC calendar dates (YYYY-MM-DD); date-times are ISO strings.
const toDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);

// A calendar month: the 31st of January plus one month is the last day of February.
export const addMonths = (day: string, months: number) => {
  const date = toDate(day);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(date.getUTCDate(), lastDay));

  return toDay(target);
};

export const dayOf = (dateTime: string) => toDay(new Date(dateTime));
export const startOfDay = (day: string) => `${day}T00:00:00.000Z`;
export const endOfDay = (day: string) => `${day}T23:59:59.999Z`;
