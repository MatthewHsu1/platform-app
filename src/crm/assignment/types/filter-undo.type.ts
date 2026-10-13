// How the saves whose filter cannot run are undone: a created row is removed,
// an updated one gets its previous filters back.
export type FilterUndo = {
  destroy: { recordId: string; reasons: string[]; workspaceMemberId: string | undefined }[];
  putBack: { recordId: string; data: Record<string, string | null>; reasons: string[]; workspaceMemberId: string | undefined }[];
};
