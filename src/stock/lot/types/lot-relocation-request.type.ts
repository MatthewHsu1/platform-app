// `toLocationId` null: the user cleared the lot's location.
export type LotRelocationRequest = { lotId: string; toLocationId: string | null };
