// The clicking user's access: their member, whether they are Admin, the building blocks their role
// was made from (every block for Admin, none for a role Platform did not make), and the Roles flag.
export type CallerAccess = { workspaceMemberId: string | null; isWorkspaceAdmin: boolean; blockKeys: string[]; canManageRoles: boolean };
