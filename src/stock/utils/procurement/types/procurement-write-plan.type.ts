// Every row a procurement run writes, with ids chosen when it was planned, so a
// rerun of the stored plan creates only the rows that are not there yet.
export type ProcurementWritePlan = {
  runId: string;
  moves: { id: string; data: Record<string, unknown> }[];
  moveLinks: { id: string; data: { moveOrigId: string; moveDestId: string } }[];
  routeLinks: { id: string; data: { stockMoveId: string; stockRouteId: string } }[];
  referenceLinks: { id: string; data: { moveId: string; referenceId: string } }[];
  partnerUpdates: { moveId: string; companyId: string }[];
};
