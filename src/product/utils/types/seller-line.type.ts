export type SellerLine = {
  id: string;
  createdAt: string;
  partnerId: string;
  sequence: number;
  minQty: number;
  price: number;
  discount: number;
  productUomId: string;
  productTmplId: string;
  productId: string | null;
  dateStart: string | null;
  dateEnd: string | null;
};
