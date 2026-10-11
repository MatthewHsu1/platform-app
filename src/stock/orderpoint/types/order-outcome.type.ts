import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

// `details`: what was left unordered, shown beside the success message.
export type OrderOutcome = { message: TranslatableText; pickingName: string | null; details: TranslatableText[] };
