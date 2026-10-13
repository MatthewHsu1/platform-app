import { type CheckLine } from 'src/stock/utils/types/check-line.type';

export type PrepareValidateLine = CheckLine & { quantityInMoveUnit: number };
