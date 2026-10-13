import { type HelpdeskSettings } from 'src/helpdesk/types/helpdesk-settings.type';
import { readApplicationVariable } from 'src/shared/application-variables/read-application-variable';
import { readLiveApplicationVariables } from 'src/shared/application-variables/read-live-application-variables';

const readBoolean = (value: string | undefined, fallback: boolean) =>
  value === undefined || value === '' ? fallback : value === 'true';

// The saved values, read from Twenty. If that read fails, the values the run was started with stand in.
export const readHelpdeskSettings = async (): Promise<HelpdeskSettings> => {
  const live = await readLiveApplicationVariables().catch(() => null);
  const read = async (key: string) => (live === null ? readApplicationVariable(key) : live.get(key));
  const duplicateStageId = (await read('HELPDESK_DUPLICATE_TICKET_STAGE')) ?? '';

  return {
    autoAssign: readBoolean(await read('HELPDESK_TICKET_AUTO_ASSIGN'), true),
    duplicateTracking: readBoolean(await read('HELPDESK_DUPLICATE_TRACKING'), false),
    duplicateStageId: duplicateStageId === '' ? null : duplicateStageId,
  };
};
