import { type ReplenishForm } from 'src/stock/orderpoint/types/replenish-form.type';

// The pop-up without the forecast, and the warehouse locations a
// replenishment reads its forecast from and orders into.
export type ReplenishChoices = {
  form: Omit<ReplenishForm, 'quantity' | 'forecast'>;
  viewLocationId: string | null;
  lotStockId: string | null;
};
