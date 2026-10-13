export type RoutingProduct = {
  id: string;
  name: string;
  productType: string;
  isStorable: boolean;
  categoryId: string | null;
  uomId: string;
  routeIds: string[];
};
