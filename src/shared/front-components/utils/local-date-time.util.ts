// The value a datetime-local input shows for an ISO date-time, in the person's time zone.
export const toLocalDateTime = (isoValue: string) => {
  const date = new Date(isoValue);

  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export const toIsoDateTime = (localValue: string) => {
  const parsed = new Date(localValue);

  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
