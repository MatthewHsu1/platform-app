export const BATCH_OBJECT = { objectSingular: 'stockPickingBatch', objectPlural: 'stockPickingBatches' } as const;

export const BATCH_ROW =
  'id name description state isWave pickingTypeId responsibleId scheduledDate updatedAt deletedAt updatedBy { source }';
