// A save whose serial is another product's, or another equipment's, gets the product and serial it had (none on a
// new equipment) back. `data` holds only the fields to put back.
export type SerialPlan =
  | { kind: 'keep' }
  | { kind: 'putBack'; reason: 'serialOfOtherProduct' | 'serialTaken'; data: { productId?: string | null; lotId?: string | null } };
