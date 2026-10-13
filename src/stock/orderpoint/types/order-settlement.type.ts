import { type OrderFinishPlan } from 'src/stock/orderpoint/types/order-finish-plan.type';

export type OrderSettlement = { writtenIds: string[]; finish: OrderFinishPlan | null; revertIds: string[] };
