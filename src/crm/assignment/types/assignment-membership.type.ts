import { type MembershipRow } from 'src/sales-team/team/types/membership-row.type';

export type AssignmentMembership = MembershipRow & { name: string | null };
