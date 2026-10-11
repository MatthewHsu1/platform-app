export type AutoOrderpoint = {
  id: string;
  productId: string;
  trigger: 'AUTO' | 'MANUAL';
  active: boolean;
  locationId: string;
  locationCompleteName: string;
  createdAt: string;
  productMinQty: number;
};
