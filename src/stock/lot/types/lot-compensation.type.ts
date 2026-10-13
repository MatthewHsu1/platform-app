// Stock without a lot turned into a lot: `quantity` leaves `noLotKey` and arrives at `lotKey`.
export type LotCompensation = {
  id: string;
  moveLineId: string;
  lotKey: string;
  noLotKey: string;
  quantity: number;
  date: string;
};
