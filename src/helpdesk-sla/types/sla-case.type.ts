// What a policy looks at on a case. `filterRecord` holds the case fields a policy filter can test.
export type SlaCase = {
  id: string;
  createdAt: string;
  teamId: string | null;
  categoryId: string | null;
  tagIds: string[];
  stageId: string | null;
  filterRecord: Record<string, unknown>;
};
