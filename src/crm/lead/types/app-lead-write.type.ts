// A write of Platform's own code: `guard` makes it conditional (no row
// reached = another writer changed the lead first).
export type AppLeadWrite = { leadId: string; data: Record<string, unknown>; guard?: Record<string, unknown> };
