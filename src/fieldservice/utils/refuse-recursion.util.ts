// A record is cyclic when its own id appears in its ancestor chain.
// A null ancestor means the root, which can never be a cycle.
export const refuseRecursion = (recordId: string, parentChainIds: Array<string | null>): boolean =>
  parentChainIds.some((parentId) => parentId === recordId);
