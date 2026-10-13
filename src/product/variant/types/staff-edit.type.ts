import { type SyncedField } from 'src/product/utils/types/synced-field.type';

export type StaffEdit = {
  source: 'template' | 'variant';
  edits: Partial<Record<SyncedField, { before: unknown; after: unknown }>>;
  savedAt: string;
};
