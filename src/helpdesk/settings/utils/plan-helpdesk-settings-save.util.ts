import { HELPDESK_SETTINGS_MESSAGES } from 'src/helpdesk/settings/helpdesk-settings-messages.constant';
import { type HelpdeskSettings } from 'src/helpdesk/types/helpdesk-settings.type';

// The variables a save of the settings page writes: only what changed. The stage a duplicate moves to holds an
// existing stage or nothing; nothing is saved as an empty text.
export const planHelpdeskSettingsSave = ({
  stored,
  submitted,
  stageIds,
}: {
  stored: HelpdeskSettings;
  submitted: HelpdeskSettings;
  stageIds: string[];
}): { kind: 'save'; variables: Record<string, boolean | string> } | { kind: 'refuse'; reason: string } => {
  if (
    typeof submitted.autoAssign !== 'boolean' ||
    typeof submitted.duplicateTracking !== 'boolean' ||
    (submitted.duplicateStageId !== null && typeof submitted.duplicateStageId !== 'string')
  ) {
    return { kind: 'refuse', reason: HELPDESK_SETTINGS_MESSAGES.badForm };
  }
  if (submitted.duplicateStageId !== null && !stageIds.includes(submitted.duplicateStageId)) {
    return { kind: 'refuse', reason: HELPDESK_SETTINGS_MESSAGES.chooseExistingStage };
  }
  const variables: Record<string, boolean | string> = {};

  if (submitted.autoAssign !== stored.autoAssign) {
    variables.HELPDESK_TICKET_AUTO_ASSIGN = submitted.autoAssign;
  }
  if (submitted.duplicateTracking !== stored.duplicateTracking) {
    variables.HELPDESK_DUPLICATE_TRACKING = submitted.duplicateTracking;
  }
  if (submitted.duplicateStageId !== stored.duplicateStageId) {
    variables.HELPDESK_DUPLICATE_TICKET_STAGE = submitted.duplicateStageId ?? '';
  }

  return { kind: 'save', variables };
};
