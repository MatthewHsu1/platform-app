// rebuild: install and daily job. save: the Roles page sets one person's blocks.
export type RoleSyncRequest = { kind: 'rebuild' } | { kind: 'save'; workspaceMemberId: string; blockKeys: string[] };
