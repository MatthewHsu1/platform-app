// Service-level rows of work cases. The SLA module fills these in; until then a case has none.
export const attachSlasToNewCases = async (caseIds: string[], now: string): Promise<void> => {
  void caseIds;
  void now;
};

export const recomputeSlasOnStageSave = async (saves: { caseId: string; stageId: string | null }[], now: string): Promise<void> => {
  void saves;
  void now;
};

export const restoreSlaRowsOfCases = async (cases: { id: string; deletedAt: string | null }[]): Promise<void> => {
  void cases;
};
