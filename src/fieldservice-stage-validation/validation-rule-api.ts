import { type ValidationRuleText } from 'src/fieldservice-stage-validation/types/validation-rule-text.type';
import { FLAG_OFF_MESSAGE, twentyInstallApi } from 'src/shared/install/twenty-install-api';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

// Validation rules through the metadata API, with the app role (it holds the Data Model flag). The workspace
// flag IS_VALIDATION_RULES_ENABLED must be on, or every call answers that it is off.
export const validationRuleApi = {
  isEnabled: async (objectMetadataId: string) => {
    const response = await twentyMetadata(
      'application',
      `query Probe($objectMetadataId: UUID!) { validationRules(objectMetadataId: $objectMetadataId) { id } }`,
      { objectMetadataId },
    );

    if (response.errors?.some((error) => error.message.includes(FLAG_OFF_MESSAGE))) {
      return false;
    }
    requireData(response, 'Probe validation rules');

    return true;
  },

  list: async (objectMetadataId: string) =>
    requireData(
      await twentyMetadata<{ validationRules: (ValidationRuleText & { id: string })[] }>(
        'application',
        `query Rules($objectMetadataId: UUID!) { validationRules(objectMetadataId: $objectMetadataId) { id name expression message } }`,
        { objectMetadataId },
      ),
      'List validation rules',
    ).validationRules,

  create: (objectMetadataId: string, rule: ValidationRuleText) => twentyInstallApi.createValidationRule({ objectMetadataId, ...rule }),

  update: async ({ id, ...rule }: ValidationRuleText & { id: string }) => {
    requireData(
      await twentyMetadata(
        'application',
        `mutation UpdateRule($input: UpdateValidationRuleInput!) { updateValidationRule(input: $input) { id } }`,
        { input: { id, update: rule } },
      ),
      `Update validation rule ${rule.name}`,
    );
  },

  remove: async (id: string) => {
    requireData(
      await twentyMetadata('application', `mutation DropRule($id: UUID!) { deleteValidationRule(id: $id) { id } }`, { id }),
      `Delete validation rule ${id}`,
    );
  },
};
