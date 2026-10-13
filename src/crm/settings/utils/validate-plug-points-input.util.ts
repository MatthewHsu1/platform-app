import { CRM_ASSIGNMENT_PLUG_POINT } from 'src/crm/assignment/plug/assignment-plug.constant';
import { CRM_SETTINGS_MESSAGES } from 'src/crm/settings/crm-settings-messages.constant';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';
import { type PlugPointsConfig } from 'src/shared/plug/types/plug-points-config.type';
import { isPlugRoutePath } from 'src/shared/plug/utils/build-plug-request.util';

// The plug points this version answers, with the choices each adds to the common settings.
const IMPLEMENTED_POINTS: Record<string, { extraChoices: Record<string, string[]> }> = {
  [CRM_ASSIGNMENT_PLUG_POINT]: { extraChoices: { leftOut: ['DEFAULT', 'UNTOUCHED'] } },
};

const MIN_TIMEOUT_SECONDS = 1;
const MAX_TIMEOUT_SECONDS = 120;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const isHttpsUrl = (url: unknown) => {
  if (typeof url !== 'string') {
    return false;
  }
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

const isTarget = (target: unknown) =>
  target === null ||
  (isRecord(target) &&
    ((target.kind === 'route' && typeof target.path === 'string' && isPlugRoutePath(target.path)) || (target.kind === 'url' && isHttpsUrl(target.url))));

type Invalid = { kind: 'invalid'; reason: string; values: TranslationValues };

const refuse = (reason: string, values: TranslationValues = {}): Invalid => ({ kind: 'invalid', reason, values });

// The plug settings the page sends, checked before they are saved: Platform's
// own token goes only to a route of this workspace, anything else needs https.
export const validatePlugPointsInput = (input: unknown): { kind: 'valid'; value: PlugPointsConfig } | Invalid => {
  if (!isRecord(input) || input.version !== 1 || !isRecord(input.points)) {
    return refuse(CRM_SETTINGS_MESSAGES.badPlugSettings);
  }
  for (const [name, config] of Object.entries(input.points)) {
    const implemented = IMPLEMENTED_POINTS[name];

    if (implemented === undefined || !isRecord(config)) {
      return refuse(CRM_SETTINGS_MESSAGES.plugPointUnavailable, { name });
    }
    if (typeof config.enabled !== 'boolean') {
      return refuse(CRM_SETTINGS_MESSAGES.plugPointEnabled, { name });
    }
    if (!isTarget(config.target)) {
      return refuse(CRM_SETTINGS_MESSAGES.plugTarget, { name });
    }
    if (
      typeof config.timeoutSeconds !== 'number' ||
      !Number.isInteger(config.timeoutSeconds) ||
      config.timeoutSeconds < MIN_TIMEOUT_SECONDS ||
      config.timeoutSeconds > MAX_TIMEOUT_SECONDS
    ) {
      return refuse(CRM_SETTINGS_MESSAGES.plugTimeout, { name });
    }
    if (config.onError !== 'DEFAULT' && config.onError !== 'SKIP') {
      return refuse(CRM_SETTINGS_MESSAGES.plugOnError, { name });
    }
    for (const [key, choices] of Object.entries(implemented.extraChoices)) {
      if (!choices.includes(String(config[key]))) {
        return refuse(CRM_SETTINGS_MESSAGES.plugChoice, { key, name });
      }
    }
  }

  return { kind: 'valid', value: input as PlugPointsConfig };
};
