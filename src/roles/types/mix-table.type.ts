// Mixed role id → the closed block keys it was made from. Kept in the app's key-value store.
export type MixTable = { version: 1; roles: Record<string, string[]> };
