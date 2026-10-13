// Working hours are typed as decimal hours; minutes are rounded and 24 means the last moment of the day.
export const floatToTime = (hours: number) => {
  let hour = Math.trunc(hours);
  let minute = Math.round(60 * (hours - hour));

  if (minute === 60) {
    hour += 1;
    minute = 0;
  }
  if (hour === 24 && minute === 0) {
    return { hour: 23, minute: 59, second: 59, millisecond: 999 };
  }

  return { hour, minute, second: 0, millisecond: 0 };
};
