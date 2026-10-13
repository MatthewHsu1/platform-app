import { type TranslationValues } from 'src/shared/i18n/types/translation-values.type';

// Why a plug call gave no usable answer: an English source text the caller
// translates with its values. `cause` is the plug point's own reason for
// refusing an answer.
export type PlugFailure = { message: string; values: TranslationValues; cause?: PlugFailure };
