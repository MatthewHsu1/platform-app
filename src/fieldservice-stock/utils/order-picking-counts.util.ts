import { PICKING_TYPE_CODE } from 'src/stock/stock-options.constant';

// Deliveries are the order's outgoing transfers and returns its incoming ones; an internal transfer counts in
// neither.
export const orderPickingCounts = (pickingTypeCodes: (string | null)[]) => ({
  deliveryCount: pickingTypeCodes.filter((code) => code === PICKING_TYPE_CODE.OUTGOING).length,
  returnCount: pickingTypeCodes.filter((code) => code === PICKING_TYPE_CODE.INCOMING).length,
});
