import { type ReplenishmentIssue } from 'src/stock/orderpoint/types/replenishment-issue.type';

export type OrderpointFailure = ReplenishmentIssue & { orderpointId: string };
