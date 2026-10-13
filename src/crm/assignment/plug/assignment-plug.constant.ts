import { type PlugPointsConfig } from 'src/shared/plug/types/plug-points-config.type';

export const CRM_ASSIGNMENT_PLUG_POINT = 'crm.assignment.v1';

export const DEFAULT_PLUG_POINTS: PlugPointsConfig = {
  version: 1,
  points: {
    [CRM_ASSIGNMENT_PLUG_POINT]: { enabled: false, target: null, timeoutSeconds: 30, onError: 'DEFAULT', leftOut: 'DEFAULT' },
  },
};
