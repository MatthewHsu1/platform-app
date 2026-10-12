import { readApplicationVariable } from 'src/shared/application-variables/read-application-variable';
import { PLUG_POINTS_VARIABLE_KEY } from 'src/shared/plug/plug-points-variable-key.constant';
import { type PlugPointConfig } from 'src/shared/plug/types/plug-point-config.type';
import { parsePlugPoints } from 'src/shared/plug/utils/parse-plug-points.util';

export const readPlugConfig = async (name: string): Promise<PlugPointConfig | null> =>
  parsePlugPoints(await readApplicationVariable(PLUG_POINTS_VARIABLE_KEY)).points[name] ?? null;
