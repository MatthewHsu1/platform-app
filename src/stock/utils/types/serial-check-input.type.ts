import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type LotsAtValidatePlan } from 'src/stock/utils/types/lots-at-validate-plan.type';
import { type SerialCheckLine } from 'src/stock/utils/types/serial-check-line.type';
import { type SerialQuant } from 'src/stock/utils/types/serial-quant.type';

export type SerialCheckInput = {
  lines: SerialCheckLine[];
  lotPlan: Pick<LotsAtValidatePlan, 'assign' | 'create'>;
  lotNameById: Map<string, string>;
  quants: SerialQuant[];
  locations: Map<string, { parentPath: string | null; usage: LocationUsage }>;
  digits: number;
};
