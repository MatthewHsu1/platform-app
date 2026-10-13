import { readApplicationVariable } from 'src/shared/application-variables/read-application-variable';
import { type HelpdeskSettings } from 'src/helpdesk/types/helpdesk-settings.type';

const readBoolean = (value: string | undefined, fallback: boolean) =>
  value === undefined || value === '' ? fallback : value === 'true';

// Variables reach a logic function as text.
export const readHelpdeskSettings = async (): Promise<HelpdeskSettings> => {
  const duplicateStageId = (await readApplicationVariable('HELPDESK_DUPLICATE_TICKET_STAGE')) ?? '';

  return {
    autoAssign: readBoolean(await readApplicationVariable('HELPDESK_TICKET_AUTO_ASSIGN'), true),
    duplicateTracking: readBoolean(await readApplicationVariable('HELPDESK_DUPLICATE_TRACKING'), false),
    duplicateStageId: duplicateStageId === '' ? null : duplicateStageId,
  };
};
