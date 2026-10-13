import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

// A settings save refused: an English source text and its values, translated by the route.
export type SettingsRefusal = { kind: 'refuse'; reason: string; values: TranslationValues };
