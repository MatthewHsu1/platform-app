import { type OrderChunkMark } from 'src/stock/orderpoint/types/order-chunk-mark.type';
import { type OrderFinishPlan } from 'src/stock/orderpoint/types/order-finish-plan.type';
import { type OrderSettlement } from 'src/stock/orderpoint/types/order-settlement.type';

// Which rules of a button order were ordered: those of every marked chunk,
// except the one whose procurement claim is still there uncommitted, as that
// chunk wrote nothing. Ordered rules lose their typed quantity; the rest
// keep it and go back to manual if the click made them automatic.
export const planOrderSettlement = ({
  plan,
  chunks,
  pendingProcurementRunId,
}: {
  plan: OrderFinishPlan;
  chunks: OrderChunkMark[];
  pendingProcurementRunId: string | null;
}): OrderSettlement => {
  const written = new Set(
    chunks.filter((chunk) => chunk.procurementRunId !== pendingProcurementRunId).flatMap((chunk) => chunk.orderpointIds),
  );

  return {
    writtenIds: plan.orderpointIds.filter((id) => written.has(id)),
    finish: written.size === 0 ? null : { ...plan, clearTypedIds: plan.clearTypedIds.filter((id) => written.has(id)) },
    revertIds: plan.automaticIds.filter((id) => !written.has(id)),
  };
};
