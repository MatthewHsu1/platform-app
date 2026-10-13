import { type PlugPointConfig } from 'src/shared/plug/types/plug-point-config.type';

export type PlugPointsConfig = { version: 1; points: Record<string, PlugPointConfig> };
