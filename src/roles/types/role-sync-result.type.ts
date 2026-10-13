// failed: the mixed roles Twenty refused to rebuild or delete this run, with its answer; the run
// went on with the others and tries them again next time.
export type RoleSyncResult = {
  created: string[];
  updated: string[];
  assignedRoleId: string | null;
  deleted: string[];
  failed: { roleId: string; message: string }[];
  rowAccessWritten: boolean;
  warnings: string[];
};
