// The number of active work cases at each given location, zero for a location without any. An archived case does
// not count.
export const ticketCounts = (
  locationIds: string[],
  cases: { fsmLocationId: string | null; active: boolean | null }[],
): { id: string; ticketCount: number }[] =>
  locationIds.map((id) => ({
    id,
    ticketCount: cases.filter((row) => row.fsmLocationId === id && row.active !== false).length,
  }));
