import { type BATCH_STATE } from 'src/stock-picking-batch/stock-picking-batch-options.constant';

export type BatchState = (typeof BATCH_STATE)[keyof typeof BATCH_STATE];
