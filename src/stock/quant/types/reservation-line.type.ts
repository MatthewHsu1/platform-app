export type ReservationLine = {
  id: string;
  moveId: string | null;
  quantity: number;
  quantityProductUom: number;
  picked: boolean;
  createdAt: string;
};
