export type CaseTeamRow = {
  id: string;
  name: string | null;
  sequence: number;
  active: boolean;
  createdAt: string;
  parentId: string | null;
  useSla?: boolean;
  resourceCalendarId?: string | null;
};
