// One delivery move to label; `demand` decides how many labels it gets.
export type ReceptionLabel = {
  productDisplayName: string;
  sourceName: string;
  partnerAddress: string;
  demand: number;
};
