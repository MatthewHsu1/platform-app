type Filter = Record<string, unknown>;

// The searches for leads that look like one lead; a criterion the lead lacks is null.
export type SimilarLeadQueries = {
  email: Filter | null;
  commercial: { kind: 'company'; companyId: string } | { kind: 'person'; filter: Filter } | null;
  phone: Filter | null;
};
