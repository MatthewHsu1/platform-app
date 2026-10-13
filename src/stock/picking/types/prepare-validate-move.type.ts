import { type CheckMove } from 'src/stock/utils/types/check-move.type';
import { type PrepareValidateLine } from 'src/stock/picking/types/prepare-validate-line.type';

export type PrepareValidateMove = Omit<CheckMove, 'lines'> & { lines: PrepareValidateLine[] };
