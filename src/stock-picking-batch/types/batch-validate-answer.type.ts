import { type ValidateOptions } from 'src/stock/picking/types/validate-options.type';

// What the batch Validate pop-up answered; it applies to every transfer of the batch.
export type BatchValidateAnswer = Pick<ValidateOptions, 'cancelBackorder' | 'skipExpired' | 'logEveryTransfer'>;
