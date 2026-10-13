import { type PlugFailure } from 'src/shared/plug/types/plug-failure.type';

export type PlugCallResult<TPayload> = { kind: 'answer'; payload: TPayload } | { kind: 'error'; failure: PlugFailure };
