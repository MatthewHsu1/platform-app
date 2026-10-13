import { type PlugTarget } from 'src/shared/plug/types/plug-target.type';

// Keys a single plug point adds (such as how to treat leads an answer leaves
// out) stay next to the common ones.
export type PlugPointConfig = {
  enabled: boolean;
  target: PlugTarget | null;
  timeoutSeconds: number;
  onError: 'DEFAULT' | 'SKIP';
} & Record<string, unknown>;
