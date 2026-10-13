import { type HelpdeskSettings } from 'src/helpdesk/types/helpdesk-settings.type';

// What the read route answers: the settings, the stages to choose from, and whether the person may change them.
export type HelpdeskSettingsPageData = HelpdeskSettings & {
  stages: { id: string; name: string }[];
  canEdit: boolean;
};
