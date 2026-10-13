export type PlugEnvelope<TPayload> = { plugPoint: string; requestId: string; sentAt?: string; payload: TPayload };
