import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { type StageBoardApi } from 'src/crm/stage/types/stage-board-api.type';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

type LeadObjectNode = { id: string; fieldsList: { id: string; name: string; type: string }[] };

const leadStageField = async () => {
  const data = requireData(
    await twentyMetadata<{ objects: { edges: { node: LeadObjectNode }[] } }>(
      'application',
      `query LeadObject($universalIdentifier: UUID!) {
        objects(filter: { universalIdentifier: { eq: $universalIdentifier } }, paging: { first: 1 }) {
          edges { node { id fieldsList { id name type } } }
        }
      }`,
      { universalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER },
    ),
    'Read the lead object',
  );
  const lead = data.objects.edges[0]?.node;
  const stage = lead?.fieldsList.find((field) => field.name === 'stage' && field.type === 'RELATION');

  return lead === undefined || stage === undefined ? null : { objectId: lead.id, stageFieldId: stage.id };
};

// Boards are workspace views; the app role's Views permission lets it keep
// their columns. Every call runs as the app alone.
export const TWENTY_STAGE_BOARD_API: StageBoardApi = {
  listStages: async () => (await loadLeadContext([])).stages,
  listStageBoards: async () => {
    const found = await leadStageField();

    if (found === null) {
      return [];
    }
    const data = requireData(
      await twentyMetadata<{ getViews: { id: string; type: string; mainGroupByFieldMetadataId: string | null }[] }>(
        'application',
        `query LeadViews($objectMetadataId: String) {
          getViews(objectMetadataId: $objectMetadataId) { id type mainGroupByFieldMetadataId }
        }`,
        { objectMetadataId: found.objectId },
      ),
      'List lead views',
    );

    return data.getViews.filter((view) => view.type === 'KANBAN' && view.mainGroupByFieldMetadataId === found.stageFieldId);
  },
  listGroups: async (viewId) =>
    requireData(
      await twentyMetadata<{ getViewGroups: { id: string; fieldValue: string | null; position: number }[] }>(
        'application',
        `query Columns($viewId: String) { getViewGroups(viewId: $viewId) { id fieldValue position } }`,
        { viewId },
      ),
      'List board columns',
    ).getViewGroups,
  createGroup: async (viewId, fieldValue, position) => {
    requireData(
      await twentyMetadata(
        'application',
        `mutation AddColumn($input: CreateViewGroupInput!) { createViewGroup(input: $input) { id } }`,
        { input: { viewId, fieldValue, position, isVisible: true } },
      ),
      'Add a board column',
    );
  },
  moveGroup: async (groupId, position) => {
    requireData(
      await twentyMetadata(
        'application',
        `mutation MoveColumn($input: UpdateViewGroupInput!) { updateViewGroup(input: $input) { id } }`,
        { input: { id: groupId, update: { position } } },
      ),
      'Move a board column',
    );
  },
  destroyGroup: async (groupId) => {
    requireData(
      await twentyMetadata(
        'application',
        `mutation DropColumn($input: DestroyViewGroupInput!) { destroyViewGroup(input: $input) { id } }`,
        { input: { id: groupId } },
      ),
      'Remove a board column',
    );
  },
};
