import { type InstallObject } from 'src/shared/install/install-spec.type';
import { type InstallApi } from 'src/shared/install/utils/run-install.util';
import { records } from 'src/shared/triggers/records';
import { requireData, twentyGraphql, twentyMetadata } from 'src/shared/twenty-graphql';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { capitalize } from 'src/shared/utils/capitalize.util';

const FLAG_OFF_MESSAGE = 'Feature flag "IS_VALIDATION_RULES_ENABLED" is not enabled';

// No person runs an install, so every call uses the app role alone.
export const twentyInstallApi: InstallApi = {
  listObjects: async () => {
    const data = requireData(
      await twentyMetadata<{
        objects: {
          edges: {
            node: Omit<InstallObject, 'fields'> & { fieldsList: InstallObject['fields'] };
          }[];
        };
      }>(
        'application',
        `{ objects(paging: { first: 1000 }) { edges { node {
          id universalIdentifier nameSingular namePlural fieldsList { id name }
        } } } }`,
      ),
      'List objects',
    );

    return data.objects.edges.map(({ node: { fieldsList, ...object } }) => ({
      ...object,
      fields: fieldsList,
    }));
  },

  createField: async ({ objectMetadataId, ...field }) => {
    requireData(
      await twentyMetadata(
        'application',
        `mutation CreateStaffList($input: CreateOneFieldMetadataInput!) {
          createOneField(input: $input) { id }
        }`,
        { input: { field: { objectMetadataId, isNullable: true, ...field } } },
      ),
      `Create field ${field.name}`,
    );
  },

  listRecordNames: async (object) => {
    const data = requireData(
      await twentyGraphql<Record<string, { edges: { node: { name: string | null } }[] }>>(
        'application',
        `{ ${object.namePlural}(first: 1000) { edges { node { name } } } }`,
      ),
      `List ${object.namePlural}`,
    );

    return data[object.namePlural].edges.flatMap(({ node }) => textOrNull(node.name) ?? []);
  },

  createRecords: async (object, names) => {
    requireData(
      await twentyGraphql(
        'application',
        `mutation CreateDefaultRows($data: [${capitalize(object.nameSingular)}CreateInput!]!) {
          create${capitalize(object.namePlural)}(data: $data) { id }
        }`,
        { data: names.map((name) => ({ name })) },
      ),
      `Create ${object.namePlural}`,
    );
  },

  listViewNames: async (objectMetadataId) => {
    const data = requireData(
      await twentyMetadata<{ getViews: { name: string }[] }>(
        'application',
        `query Views($objectMetadataId: String) {
          getViews(objectMetadataId: $objectMetadataId) { name }
        }`,
        { objectMetadataId },
      ),
      'List views',
    );

    return data.getViews.map((view) => view.name);
  },

  createBoard: async ({ objectMetadataId, name, icon, groupByFieldMetadataId, hideWhere, filters, aggregate, cardFieldMetadataIds }) => {
    const data = requireData(
      await twentyMetadata<{ createView: { id: string } }>(
        'application',
        `mutation CreateBoard($input: CreateViewInput!) { createView(input: $input) { id } }`,
        {
          input: {
            name,
            icon,
            objectMetadataId,
            type: 'KANBAN',
            mainGroupByFieldMetadataId: groupByFieldMetadataId,
            ...(aggregate === undefined
              ? {}
              : {
                  kanbanAggregateOperation: aggregate.operation,
                  kanbanAggregateOperationFieldMetadataId: aggregate.fieldMetadataId,
                }),
          },
        },
      ),
      `Create view ${name}`,
    );

    if (hideWhere !== undefined) {
      requireData(
        await twentyMetadata(
          'application',
          `mutation HideOnBoard($input: CreateViewFilterInput!) {
            createViewFilter(input: $input) { id }
          }`,
          {
            input: {
              viewId: data.createView.id,
              fieldMetadataId: hideWhere.fieldMetadataId,
              operand: 'IS_NOT',
              value: JSON.stringify(hideWhere.values),
            },
          },
        ),
        `Filter view ${name}`,
      );
    }

    for (const filter of filters ?? []) {
      requireData(
        await twentyMetadata(
          'application',
          `mutation FilterBoard($input: CreateViewFilterInput!) {
            createViewFilter(input: $input) { id }
          }`,
          { input: { viewId: data.createView.id, ...filter } },
        ),
        `Filter view ${name}`,
      );
    }

    for (const [position, fieldMetadataId] of (cardFieldMetadataIds ?? []).entries()) {
      requireData(
        await twentyMetadata(
          'application',
          `mutation ShowOnCard($input: CreateViewFieldInput!) { createViewField(input: $input) { id } }`,
          { input: { viewId: data.createView.id, fieldMetadataId, position, isVisible: true } },
        ),
        `Show a field on ${name}`,
      );
    }
  },

  createListView: async ({ objectMetadataId, name, icon, fieldMetadataIds }) => {
    const data = requireData(
      await twentyMetadata<{ createView: { id: string } }>(
        'application',
        `mutation CreateList($input: CreateViewInput!) { createView(input: $input) { id } }`,
        { input: { name, icon, objectMetadataId, type: 'TABLE' } },
      ),
      `Create view ${name}`,
    );

    for (const [position, fieldMetadataId] of fieldMetadataIds.entries()) {
      requireData(
        await twentyMetadata(
          'application',
          `mutation ShowColumn($input: CreateViewFieldInput!) { createViewField(input: $input) { id } }`,
          { input: { viewId: data.createView.id, fieldMetadataId, position, isVisible: true } },
        ),
        `Show a column on ${name}`,
      );
    }

    return data.createView.id;
  },

  createViewFilterGroup: async (input) =>
    requireData(
      await twentyMetadata<{ createViewFilterGroup: { id: string } }>(
        'application',
        `mutation FilterGroup($input: CreateViewFilterGroupInput!) { createViewFilterGroup(input: $input) { id } }`,
        { input },
      ),
      'Group view filters',
    ).createViewFilterGroup.id,

  createViewFilter: async (input) => {
    requireData(
      await twentyMetadata(
        'application',
        `mutation FilterView($input: CreateViewFilterInput!) { createViewFilter(input: $input) { id } }`,
        { input },
      ),
      'Filter view',
    );
  },

  listViews: async (objectMetadataId) =>
    requireData(
      await twentyMetadata<{ getViews: { id: string; name: string; key: string | null }[] }>(
        'application',
        `query Views($objectMetadataId: String) { getViews(objectMetadataId: $objectMetadataId) { id name key } }`,
        { objectMetadataId },
      ),
      'List views',
    ).getViews,

  listViewSorts: async (viewId) =>
    requireData(
      await twentyMetadata<{ getViewSorts: { id: string }[] }>(
        'application',
        `query Sorts($viewId: String) { getViewSorts(viewId: $viewId) { id } }`,
        { viewId },
      ),
      'List view sorts',
    ).getViewSorts,

  createViewSort: async (input) => {
    requireData(
      await twentyMetadata('application', `mutation Sort($input: CreateViewSortInput!) { createViewSort(input: $input) { id } }`, { input }),
      'Sort view',
    );
  },

  listSeedKeys: async (object) => {
    const found = await records(object.nameSingular, object.namePlural).find<{
      id: string;
      seedKey: string;
    }>({ seedKey: { is: 'NOT_NULL' } }, 'id seedKey');

    return new Map(found.map((row) => [row.seedKey, row.id]));
  },

  createSeedRow: async (object, values) => {
    const [id] = await records(object.nameSingular, object.namePlural).createMany([values]);

    return id;
  },

  listUnkeyedRows: (object, names) =>
    records(object.nameSingular, object.namePlural).find<{ id: string; name: string; createdAt: string }>(
      { seedKey: { is: 'NULL' }, name: { in: names } },
      'id name createdAt',
    ),

  setSeedKey: (object, id, seedKey) => records(object.nameSingular, object.namePlural).update(id, { seedKey }),

  areValidationRulesEnabled: async () => {
    const objects = await twentyInstallApi.listObjects();
    const response = await twentyMetadata(
      'application',
      `query Probe($objectMetadataId: UUID!) { validationRules(objectMetadataId: $objectMetadataId) { id } }`,
      { objectMetadataId: objects[0]?.id },
    );

    if (response.errors?.some((error) => error.message.includes(FLAG_OFF_MESSAGE))) {
      return false;
    }
    requireData(response, 'Probe validation rules');

    return true;
  },

  listValidationRuleNames: async (objectMetadataId) => {
    const data = requireData(
      await twentyMetadata<{ validationRules: { name: string }[] }>(
        'application',
        `query Rules($objectMetadataId: UUID!) { validationRules(objectMetadataId: $objectMetadataId) { name } }`,
        { objectMetadataId },
      ),
      'List validation rules',
    );

    return data.validationRules.map((rule) => rule.name);
  },

  createValidationRule: async (input) => {
    requireData(
      await twentyMetadata(
        'application',
        `mutation CreateRule($input: CreateValidationRuleInput!) { createValidationRule(input: $input) { id } }`,
        { input },
      ),
      `Create validation rule ${input.name}`,
    );
  },
};
