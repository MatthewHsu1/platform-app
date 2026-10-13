import { type AutoBatchType } from 'src/stock-picking-batch/types/auto-batch-type.type';

export type AutoWaveType = AutoBatchType & {
  waveGroupByProduct: boolean;
  waveGroupByCategory: boolean;
  waveGroupByLocation: boolean;
  waveCategoryIds: string[];
  // By full name, so a location comes before the locations under it.
  waveLocationIds: string[];
};
