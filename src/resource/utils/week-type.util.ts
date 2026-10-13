const DAY = 86_400_000;
const ORDINAL_OF_1970_01_01 = 719_163;

// Weeks alternate without a break across years: the week number counts from the first day of year 1, so a
// 53-week year cannot put two odd weeks in a row.
export const weekType = ({ year, month, day }: { year: number; month: number; day: number }): 0 | 1 => {
  const ordinal = Date.UTC(year, month - 1, day) / DAY + ORDINAL_OF_1970_01_01;

  return (Math.floor((ordinal - 1) / 7) % 2) as 0 | 1;
};
