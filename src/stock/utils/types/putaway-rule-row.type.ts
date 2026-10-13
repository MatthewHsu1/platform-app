export type PutawayRuleRow = {
  name: string | null;
  locationInId: string | null;
  locationOutId: string | null;
  storageCategoryId: string | null;
  sublocation: 'NO' | 'LAST_USED' | 'CLOSEST_LOCATION';
};
