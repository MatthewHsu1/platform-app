import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

export type MarkLostPlan =
  | { kind: 'refuse'; reason: string; values: TranslationValues }
  | {
      kind: 'update';
      userData: { wonStatus: string; probability: number; lostReasonId: string | null };
      appData: { automatedProbability: number };
    };
