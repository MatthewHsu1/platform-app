import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

export type LeadDays = {
  totalDelay: number;
  horizonTime: number;
  descriptions: { label: TranslatableText; value: TranslatableText }[];
};
