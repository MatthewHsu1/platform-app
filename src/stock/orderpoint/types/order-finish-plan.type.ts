// What a button order does once its procurements are written: clear the typed
// quantity of `clearTypedIds`, recompute and clean up `orderpointIds`.
// `automaticIds` were made automatic for the order and go back to manual if
// it never writes.
export type OrderFinishPlan = { orderpointIds: string[]; clearTypedIds: string[]; automaticIds: string[] };
