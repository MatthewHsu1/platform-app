// One delivery move per entry, with the quantity (product unit) to allocate
// to it or take off it, and the incoming moves the report offered for it.
export type AllocationRequest = { moveId: string; quantity: number; inIds: string[] }[];
