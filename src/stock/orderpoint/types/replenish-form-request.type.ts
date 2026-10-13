// What the Replenish pop-up asks for. From a product, `productId` is the
// variant picked; `routeId` undefined means the product's default route.
export type ReplenishFormRequest = {
  productTemplateId: string | null;
  productId: string | null;
  warehouseId: string | null;
  routeId?: string | null;
};
