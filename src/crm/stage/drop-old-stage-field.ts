import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { type PreInstallApi } from 'src/shared/install/types/pre-install-api.type';
import { isNewModule } from 'src/shared/install/utils/run-install.util';

const STAGE_RECORDS_VERSION = '2.4.0';

// Before 2.4.0 a lead's stage was a staff list named "stage". The stage
// relation has the same name, so the old field and the boards grouped by it
// must go before the new data model is synced. No lead data is kept.
export const dropOldStageField = async ({
  api,
  previousVersion,
}: {
  api: PreInstallApi;
  previousVersion: string | undefined;
}): Promise<'dropped' | 'skipped'> => {
  if (previousVersion === undefined || previousVersion === '' || !isNewModule(previousVersion, STAGE_RECORDS_VERSION)) {
    return 'skipped';
  }
  const lead = await api.findObject(CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER);
  const oldStage = lead?.fields.find((field) => field.name === 'stage' && field.type === 'SELECT');

  if (lead === null || oldStage === undefined) {
    return 'skipped';
  }
  for (const view of (await api.listViews(lead.id)).filter((candidate) => candidate.mainGroupByFieldMetadataId === oldStage.id)) {
    await api.destroyView(view.id);
  }
  await api.deactivateField(oldStage.id);
  await api.deleteField(oldStage.id);

  return 'dropped';
};
