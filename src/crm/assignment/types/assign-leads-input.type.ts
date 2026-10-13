import { type AssignmentDoor } from 'src/crm/assignment/types/assignment-door.type';

export type AssignLeadsInput = {
  teamIds: string[];
  forceQuota: boolean;
  creationDeltaDays: number;
  door: AssignmentDoor;
  requestedBy: string | null;
  locale?: string;
};
