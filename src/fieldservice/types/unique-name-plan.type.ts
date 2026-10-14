// A save whose name another live row already holds gets its old name back (none on a new row).
export type UniqueNamePlan = { kind: 'keep' } | { kind: 'putBack'; name: string | null };
