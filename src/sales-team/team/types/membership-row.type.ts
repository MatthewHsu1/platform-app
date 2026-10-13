export type MembershipRow = {
  id: string;
  teamId: string;
  userId: string;
  active: boolean;
  assignmentMax: number;
  assignmentOptout: boolean;
  assignmentDomain: string | null;
  assignmentDomainPreferred: string | null;
  createdAt: string;
};
