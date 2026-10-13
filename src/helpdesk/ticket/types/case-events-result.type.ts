export type CaseEventsResult = {
  written: string[];
  // One entry per stage save, in save order, with the stage that save chose.
  stageSaved: { caseId: string; stageId: string | null }[];
  teamsToCount: string[];
  created: string[];
};
