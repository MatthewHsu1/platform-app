import { HELPDESK_FIELDSERVICE_MESSAGES } from 'src/helpdesk-fieldservice/helpdesk-fieldservice-messages.constant';

type CloseCasePlan =
  | { kind: 'write'; data: { stageId: string; resolution: { markdown: string } } }
  | { kind: 'refuse'; reason: string };

// Closing the work case needs the stage it moves to and a resolution; both are written together.
export const planCloseCase = ({ stageId, resolution }: { stageId: string | null; resolution: string }): CloseCasePlan => {
  if (stageId === null) {
    return { kind: 'refuse', reason: HELPDESK_FIELDSERVICE_MESSAGES.stageRequired };
  }
  if (resolution.trim() === '') {
    return { kind: 'refuse', reason: HELPDESK_FIELDSERVICE_MESSAGES.resolutionRequired };
  }

  return { kind: 'write', data: { stageId, resolution: { markdown: resolution } } };
};
