// A task attached to a service order, as the Complete button reads it. The task is null when it is gone.
export type OrderTaskTarget = { task: { id: string; status: string | null; deletedAt: string | null } | null };
