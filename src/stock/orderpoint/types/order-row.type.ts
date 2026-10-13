import { type OrderRequestRow } from 'src/stock/orderpoint/types/order-request-row.type';

export type OrderRow = OrderRequestRow & { name: string; qtyToOrderManual: number; warehouseId: string | null };
