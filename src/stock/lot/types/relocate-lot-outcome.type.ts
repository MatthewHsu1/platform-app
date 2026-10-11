import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

export type RelocateLotOutcome = { kind: 'done' } | { kind: 'refused'; reason: string; values: TranslationValues } | { kind: 'held' };
