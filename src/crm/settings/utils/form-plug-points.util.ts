import { CRM_ASSIGNMENT_PLUG_POINT, DEFAULT_PLUG_POINTS } from 'src/crm/assignment/plug/assignment-plug.constant';
import { type PlugPointsConfig } from 'src/shared/plug/types/plug-points-config.type';

// The plug points the settings page edits: each one this version answers,
// with its defaults where nothing is stored, so the page can always turn it
// on. Assignment treats any left-out choice but "leave them" as the built-in
// way, so the page shows it as that and a save does not trip over it.
export const formPlugPoints = (stored: PlugPointsConfig): PlugPointsConfig => {
  const points: PlugPointsConfig['points'] = {};

  for (const [name, defaults] of Object.entries(DEFAULT_PLUG_POINTS.points)) {
    points[name] = { ...defaults, ...stored.points[name] };
  }
  const assignment = points[CRM_ASSIGNMENT_PLUG_POINT];

  if (assignment !== undefined) {
    assignment.leftOut = assignment.leftOut === 'UNTOUCHED' ? 'UNTOUCHED' : 'DEFAULT';
  }

  return { version: 1, points };
};
