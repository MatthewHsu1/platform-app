import { type InstallObject } from 'src/shared/install/install-spec.type';
import { type InstallApi } from 'src/shared/install/utils/run-install.util';
import { requireData, twentyGraphql, twentyMetadata } from 'src/shared/twenty-graphql';

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

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

    return data[object.namePlural].edges.flatMap(({ node }) =>
      node.name === null ? [] : [node.name],
    );
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

  createBoard: async ({ objectMetadataId, name, icon, groupByFieldMetadataId, hideWhere }) => {
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
          },
        },
      ),
      `Create view ${name}`,
    );

    if (hideWhere === undefined) {
      return;
    }

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
  },
};
