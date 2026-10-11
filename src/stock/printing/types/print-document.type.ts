import { type PrintBlock } from 'src/stock/printing/types/print-block.type';

export type PrintDocument = { kind: 'document'; landscape?: boolean; blocks: PrintBlock[] };
