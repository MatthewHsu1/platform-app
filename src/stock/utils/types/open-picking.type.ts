import { type Priority } from 'src/stock/types/priority.type';

export type OpenPicking = {
  id: string;
  origin: string | null;
  companyId: string | null;
  personId: string | null;
  priority: Priority;
  scheduledDate: string | null;
  createdAt: string;
};
