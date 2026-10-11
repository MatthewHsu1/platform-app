import { type AllocationIn } from 'src/stock/utils/types/allocation-in.type';
import { type AllocationOut } from 'src/stock/utils/types/allocation-out.type';

// The moves of an allocation as they are now, and each delivery line's
// quantity in its own unit for the writes.
export type AllocationInputs = {
  allocations: { out: AllocationOut; quantity: number; ins: AllocationIn[] }[];
  lines: Map<string, { quantity: number; productUomId: string; productUnitUomId: string }>;
};
