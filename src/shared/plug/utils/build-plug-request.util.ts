import { PLUG_FAILURE_MESSAGES } from 'src/shared/plug/plug-failure-messages.constant';
import { type PlugRequest } from 'src/shared/plug/types/plug-request.type';
import { type PlugTarget } from 'src/shared/plug/types/plug-target.type';
import { plugKeyVariableName } from 'src/shared/plug/utils/parse-plug-points.util';

const ROUTE_PATH = /^\/(?!\/)[A-Za-z0-9._~\-/]*$/;
const JSON_HEADERS = { 'content-type': 'application/json' };

// A path of a route of another app in this workspace: no scheme, no host, no
// query and no step up.
export const isPlugRoutePath = (path: string) => ROUTE_PATH.test(path) && !path.split('/').includes('..');

// Platform's app token goes only to a route of an app in the same workspace.
// An outside address gets its own key, never that token.
export const buildPlugRequest = ({
  name,
  target,
  env,
}: {
  name: string;
  target: PlugTarget;
  env: Record<string, string | undefined>;
}): PlugRequest => {
  if (target.kind === 'route') {
    if (!isPlugRoutePath(target.path)) {
      return { kind: 'error', failure: { message: PLUG_FAILURE_MESSAGES.badRoute, values: {} } };
    }
    const base = (env.TWENTY_FUNCTIONS_URL || `${env.TWENTY_API_URL ?? ''}/s`).replace(/\/+$/, '');

    return {
      kind: 'ok',
      url: `${base}${target.path}`,
      headers: { ...JSON_HEADERS, authorization: `Bearer ${env.TWENTY_APP_APPLICATION_ACCESS_TOKEN ?? ''}` },
    };
  }
  let url: URL;

  try {
    url = new URL(target.url);
  } catch {
    return { kind: 'error', failure: { message: PLUG_FAILURE_MESSAGES.badUrl, values: {} } };
  }
  if (url.protocol !== 'https:') {
    return { kind: 'error', failure: { message: PLUG_FAILURE_MESSAGES.notHttps, values: {} } };
  }
  const key = env[plugKeyVariableName(name)];

  return { kind: 'ok', url: url.toString(), headers: key ? { ...JSON_HEADERS, authorization: `Bearer ${key}` } : { ...JSON_HEADERS } };
};
