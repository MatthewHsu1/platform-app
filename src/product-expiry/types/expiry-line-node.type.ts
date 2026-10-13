export type ExpiryLineNode = {
  id: string;
  pickingId: string;
  lotId: string | null;
  lotName: string | null;
  removalDate: string | null;
  lot: { name: string | null; expirationDate: string | null } | null;
  product: { name: string | null; productTmpl: { name: string | null; useExpirationDate: boolean | null } | null } | null;
};
