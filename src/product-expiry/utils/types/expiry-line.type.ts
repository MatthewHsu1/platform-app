export type ExpiryLine = {
  id: string;
  pickingId: string;
  productName: string;
  lotId: string | null;
  lotName: string | null;
  lotExpirationDate: string | null;
  removalDate: string | null;
  useExpirationDate: boolean;
};
