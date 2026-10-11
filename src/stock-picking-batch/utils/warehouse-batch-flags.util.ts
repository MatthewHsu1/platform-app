// Values a new warehouse gives its receipt and delivery types when it makes
// them; a later save of the warehouse leaves what staff chose.
export const warehouseBatchFlags = (typeField: string): { autoBatch?: true; batchGroupByPartner?: true } =>
  typeField === 'inTypeId' || typeField === 'outTypeId' ? { autoBatch: true, batchGroupByPartner: true } : {};
