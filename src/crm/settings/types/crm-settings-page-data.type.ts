import { type PlsFieldKey } from 'src/crm/scoring/types/pls-field-key.type';
import { type CrmSettingsForm } from 'src/crm/settings/types/crm-settings-form.type';

// What the read route answers: the form, and what the page shows around it.
export type CrmSettingsPageData = CrmSettingsForm & {
  plugKeySet: boolean;
  canSave: boolean;
  canUpdateProbabilities: boolean;
  plsStartDate: string | null;
  plsFields: PlsFieldKey[];
};
