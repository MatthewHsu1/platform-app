export type TeamRow = {
  id: string;
  name: string | null;
  sequence: number;
  createdAt: string;
  active: boolean;
  leaderId: string | null;
  useLeads: boolean;
  useOpportunities: boolean;
  assignmentOptout: boolean;
  assignmentMax: number;
  assignmentDomain: string | null;
  color: string | null;
  seedKey: string | null;
};
