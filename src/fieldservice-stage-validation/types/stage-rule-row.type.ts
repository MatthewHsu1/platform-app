// A stage rule as a read returns it; `otherFields` lists the names of fields staff added to the order.
export type StageRuleRow = { id: string; stage: string | null; requiredFields: string[] | null; otherFields: string | null };
