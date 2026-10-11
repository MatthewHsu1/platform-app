import { type SequenceRow } from 'src/stock/types/sequence-row.type';

export type FlowSequence = Pick<SequenceRow, 'id' | 'name' | 'prefix' | 'padding'>;
