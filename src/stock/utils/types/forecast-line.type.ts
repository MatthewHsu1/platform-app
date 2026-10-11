export type ForecastLine = {
  productId: string;
  quantity: number;
  moveInId: string | null;
  moveOutId: string | null;
  documentIn: { id: string; name: string } | null;
  documentOut: { id: string; name: string } | null;
  receiptDate: string | null;
  deliveryDate: string | null;
  replenishmentFilled: boolean;
  isLate: boolean;
  deliveryLate: boolean;
  receiptLate: boolean;
  inTransit: boolean;
  isMatched: boolean;
  reservation: { id: string; name: string } | null;
  removalDate: 'NOW' | string | null;
};
