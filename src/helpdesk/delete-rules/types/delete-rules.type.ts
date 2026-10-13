import { type CascadeChild } from 'src/shared/triggers/cascade-delete';

export type DeleteRules = { references: CascadeChild[]; cascades: CascadeChild[]; links: CascadeChild[] };
