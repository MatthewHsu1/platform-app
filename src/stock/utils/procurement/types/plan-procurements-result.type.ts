import { type PartnerUpdate } from 'src/stock/utils/procurement/types/partner-update.type';
import { type PlannedMove } from 'src/stock/utils/procurement/types/planned-move.type';
import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

export type PlanProcurementsResult = {
  moves: PlannedMove[];
  partnerUpdates: PartnerUpdate[];
  errors: TranslatableText[];
};
