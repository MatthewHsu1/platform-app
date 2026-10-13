import { type ReactNode } from 'react';

export type DataTableColumn<TRow> = {
  key: string;
  title: string;
  render: (row: TRow) => ReactNode;
};
