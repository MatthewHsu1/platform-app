export type MemberSavePlan =
  | { kind: 'refuse'; status: 400 | 403 | 404 | 409; message: string }
  | { kind: 'save'; workspaceMemberId: string; name: string; blockKeys: string[] };
