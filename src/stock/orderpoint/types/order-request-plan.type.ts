// `quantities` replaces the stored quantity to order of a rule for this order only.
export type OrderRequestPlan =
  | { kind: 'refuse'; message: 'automateRefused' }
  | { kind: 'order'; quantities: Map<string, number>; setAutoIds: string[]; nothingToOrder: boolean };
