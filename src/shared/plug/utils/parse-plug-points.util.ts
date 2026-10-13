import { type PlugPointConfig } from 'src/shared/plug/types/plug-point-config.type';
import { type PlugPointsConfig } from 'src/shared/plug/types/plug-points-config.type';
import { type PlugTarget } from 'src/shared/plug/types/plug-target.type';

const DEFAULT_TIMEOUT_SECONDS = 30;
const MIN_TIMEOUT_SECONDS = 1;
const MAX_TIMEOUT_SECONDS = 120;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const readTarget = (value: unknown): PlugTarget | null => {
  if (!isObject(value)) {
    return null;
  }
  if (value.kind === 'route' && typeof value.path === 'string') {
    return { kind: 'route', path: value.path };
  }
  if (value.kind === 'url' && typeof value.url === 'string') {
    return { kind: 'url', url: value.url };
  }
  return null;
};

const readTimeout = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(MAX_TIMEOUT_SECONDS, Math.max(MIN_TIMEOUT_SECONDS, Math.round(value)))
    : DEFAULT_TIMEOUT_SECONDS;

const readPoint = (value: unknown): PlugPointConfig => {
  const point = isObject(value) ? value : {};

  return {
    ...point,
    enabled: point.enabled === true,
    target: readTarget(point.target),
    timeoutSeconds: readTimeout(point.timeoutSeconds),
    onError: point.onError === 'SKIP' ? 'SKIP' : 'DEFAULT',
  };
};

// The settings of every plug point. Broken settings mean no plug point: the
// built-in rules run.
export const parsePlugPoints = (raw: string | undefined): PlugPointsConfig => {
  let parsed: unknown;

  try {
    parsed = raw === undefined || raw.trim() === '' ? {} : JSON.parse(raw);
  } catch {
    parsed = {};
  }
  const points = isObject(parsed) && isObject(parsed.points) ? parsed.points : {};

  return { version: 1, points: Object.fromEntries(Object.entries(points).map(([name, value]) => [name, readPoint(value)])) };
};

export const plugKeyVariableName = (name: string) => `PLUG_KEY_${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
