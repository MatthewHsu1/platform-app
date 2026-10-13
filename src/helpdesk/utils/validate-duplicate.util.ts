import { HELPDESK_ACTION_MESSAGES } from 'src/helpdesk/actions/helpdesk-action-messages.constant';

// A case can only be the duplicate of another case that is not itself a duplicate.
export const validateDuplicate = ({
  caseId,
  original,
}: {
  caseId: string;
  original: { id: string; duplicateId: string | null } | null;
}) => (original === null || original.id === caseId || original.duplicateId !== null ? HELPDESK_ACTION_MESSAGES.duplicateRefusal : null);
