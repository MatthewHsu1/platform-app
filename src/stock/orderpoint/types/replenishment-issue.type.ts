import { type TranslatableText } from 'src/stock/utils/procurement/types/translatable-text.type';

// What goes on a product as a replenishment issue task.
export type ReplenishmentIssue = {
  productTemplateId: string;
  productName: string;
  responsibleId: string | null;
  error: TranslatableText;
};
