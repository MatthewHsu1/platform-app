import { type PlugFailure } from 'src/shared/plug/types/plug-failure.type';

export type PlugRequest = { kind: 'ok'; url: string; headers: Record<string, string> } | { kind: 'error'; failure: PlugFailure };
