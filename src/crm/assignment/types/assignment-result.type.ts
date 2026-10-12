export type AssignmentResult = {
  teams: Record<string, { assigned: string[]; merged: string[]; duplicates: string[] }>;
  members: Record<string, { assigned: string[]; quota: number }>;
  errors: string[];
  messages: string[];
  plugError: string | null;
};
