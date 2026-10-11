import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

export type RelocateLotPlan =
  | { kind: 'nothing' }
  | { kind: 'refuse'; reason: string; values: TranslationValues }
  | { kind: 'move'; quantIds: string[]; unpack: boolean; toLocationId: string | null };
