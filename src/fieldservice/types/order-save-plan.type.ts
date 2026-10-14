import { type OrderState } from 'src/fieldservice/types/order-state.type';
import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

// A save the rules accept gets the values they compute; a refused one gets its written values back (a refused
// create is removed) and the reason.
export type OrderSavePlan =
  | { kind: 'write'; data: Partial<OrderState> }
  | { kind: 'refuse'; reason: string; values: TranslationValues; putBack: Partial<OrderState> };
