import { type ValidateResult } from 'src/stock/picking/types/validate-result.type';

// The route answers the ValidateResult itself; a refusal is HTTP 409 { error } instead.
export type ValidateRouteResult = Exclude<ValidateResult, { kind: 'refused' }>;
