import { claimKey, heldClaimKeys } from 'src/shared/claims/claim';

// The batches among these whose Validate holds its claim: a stopped one too,
// until its resume finishes it.
export const validatingBatchIds = async (batchIds: string[]) => {
  const held = new Set(await heldClaimKeys(batchIds.map((batchId) => claimKey('batchValidate', batchId))));

  return batchIds.filter((batchId) => held.has(claimKey('batchValidate', batchId)));
};
