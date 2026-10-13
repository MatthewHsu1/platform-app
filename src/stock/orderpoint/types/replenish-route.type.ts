// A route as the Replenish pop-up weighs it: its active rules only.
export type ReplenishRoute = {
  id: string;
  name: string;
  sequence: number;
  createdAt: string;
  active: boolean;
  productSelectable: boolean;
  rules: { delay: number; destinationInWarehouse: boolean }[];
};
