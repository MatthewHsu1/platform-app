export type ProductInventoryFacts = {
  tracking: string;
  isStorable: boolean;
  nextSerial: string;
  movesIn: number;
  movesOut: number;
  nbrReorderingRules: number;
  reorderingMinQty: number;
  reorderingMaxQty: number;
  orderpoints: { id: string; name: string; variant: string; location: string; productMinQty: number; productMaxQty: number }[];
  putawayRules: { id: string; name: string; locationIn: string; locationOut: string }[];
  storageCapacities: { id: string; name: string; storageCategory: string; quantity: number }[];
};
