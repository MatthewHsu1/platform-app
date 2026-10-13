import { type RolesPageRow } from 'src/roles/types/roles-page-row.type';

export type RolesPage = { rows: RolesPageRow[]; modules: { key: string; label: string; levels: { key: string; label: string }[] }[] };
