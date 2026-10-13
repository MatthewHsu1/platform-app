// A policy with the ids of its four lists. An empty list does not limit the policy.
export type SlaPolicy = {
  id: string;
  name: string | null;
  active: boolean;
  stageId: string | null;
  days: number;
  hours: number;
  domain: string | null;
  teamIds: string[];
  categoryIds: string[];
  tagIds: string[];
  ignoreStageIds: string[];
};
