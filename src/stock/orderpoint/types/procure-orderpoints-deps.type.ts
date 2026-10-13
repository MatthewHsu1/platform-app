import { type OrderpointFailure } from 'src/stock/orderpoint/types/orderpoint-failure.type';
import { type OrderpointProcureRow } from 'src/stock/orderpoint/types/orderpoint-procure-row.type';
import { type TryProcurementsResult } from 'src/stock/orderpoint/types/try-procurements-result.type';
import { type Procurement } from 'src/stock/utils/procurement/types/procurement.type';

export type ProcureOrderpointsDeps = {
  readOrderpoints: (orderpointIds: string[]) => Promise<OrderpointProcureRow[]>;
  readReferenceNames: (referenceIds: string[]) => Promise<Map<string, string>>;
  // Plans without writing; throws ProcurementFailure when the plan does not hold.
  checkProcurements: (procurements: Procurement[]) => Promise<void>;
  tryProcurements: (
    procurements: Procurement[],
    options: { runId: string; beforeCommit?: (claimRunId: string) => Promise<void> },
  ) => Promise<TryProcurementsResult>;
  addIssueTasks: (failures: OrderpointFailure[]) => Promise<void>;
  settings: () => { horizonDays: number; digits: number };
};
