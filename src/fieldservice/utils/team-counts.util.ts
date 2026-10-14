type TeamCounts = {
  open: number;
  needAssign: number;
  needSchedule: number;
};

// Only open orders count: needAssign means no worker yet, needSchedule means no start yet.
export const teamCounts = (
  orders: Array<{ closed: boolean; workerId: string | null; scheduledStart: string | null }>,
): TeamCounts => {
  let open = 0;
  let needAssign = 0;
  let needSchedule = 0;
  for (const order of orders) {
    if (order.closed) {
      continue;
    }
    open += 1;
    if (order.workerId === null) {
      needAssign += 1;
    }
    if (order.scheduledStart === null) {
      needSchedule += 1;
    }
  }
  return { open, needAssign, needSchedule };
};
