import { type PlugFailure } from 'src/shared/plug/types/plug-failure.type';

export type AssignmentResult = {
  teams: Record<string, { assigned: string[]; merged: string[]; duplicates: string[] }>;
  members: Record<string, { assigned: string[]; quota: number }>;
  errors: string[];
  messages: string[];
  plugError: PlugFailure | null;
  plug: { answered: number; written: string[] } | null;
};
