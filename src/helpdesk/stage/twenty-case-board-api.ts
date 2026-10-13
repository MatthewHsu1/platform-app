import { type CaseBoardApi } from 'src/helpdesk/stage/types/case-board-api.type';
import { HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { records } from 'src/shared/triggers/records';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

const stages = records('helpdeskTicketStage', 'helpdeskTicketStages');

type CaseObjectNode = { id: string; fieldsList: { id: string; name: string; type: string }[] };

const caseStageField = async () => {
  const data = requireData(
    await twentyMetadata<{ objects: { edges: { node: CaseObjectNode }[] } }>(
      'application',
      `query CaseObject($universalIdentifier: UUID!) {
        objects(filter: { universalIdentifier: { eq: $universalIdentifier } }, paging: { first: 1 }) {
          edges { node { id fieldsList { id name type } } }
        }
      }`,
      { universalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER },
    ),
    'Read the work case object',
  );
  const caseObject = data.objects.edges[0]?.node;
  const stage = caseObject?.fieldsList.find((field) => field.name === 'stage' && field.type === 'RELATION');

  return caseObject === undefined || stage === undefined ? null : { objectId: caseObject.id, stageFieldId: stage.id };
};

// Boards are workspace views; the app role's Views permission lets it keep their columns. Every call runs as
// the app alone.
export const TWENTY_CASE_BOARD_API: CaseBoardApi = {
  listStages: async () =>
    (
      await stages.find<{
        id: string;
        name: string | null;
        sequence: number | null;
        active: boolean | null;
        unattended: boolean | null;
        closed: boolean | null;
        fold: boolean | null;
        createdAt: string;
      }>({}, 'id name sequence active unattended closed fold createdAt')
    ).map((row) => ({
      id: row.id,
      name: row.name,
      sequence: row.sequence ?? 0,
      active: row.active !== false,
      unattended: row.unattended === true,
      closed: row.closed === true,
      fold: row.fold === true,
      createdAt: row.createdAt,
      teamIds: [],
    })),
  listBoards: async () => {
    const found = await caseStageField();

    if (found === null) {
      return [];
    }
    const data = requireData(
      await twentyMetadata<{ getViews: { id: string; type: string; mainGroupByFieldMetadataId: string | null }[] }>(
        'application',
        `query CaseViews($objectMetadataId: String) {
          getViews(objectMetadataId: $objectMetadataId) { id type mainGroupByFieldMetadataId }
        }`,
        { objectMetadataId: found.objectId },
      ),
      'List work case views',
    );

    return data.getViews.filter((view) => view.type === 'KANBAN' && view.mainGroupByFieldMetadataId === found.stageFieldId);
  },
  listGroups: async (viewId) =>
    requireData(
      await twentyMetadata<{ getViewGroups: { id: string; fieldValue: string | null; position: number; isVisible: boolean }[] }>(
        'application',
        `query Columns($viewId: String) { getViewGroups(viewId: $viewId) { id fieldValue position isVisible } }`,
        { viewId },
      ),
      'List board columns',
    ).getViewGroups,
  createGroup: async (viewId, group) => {
    requireData(
      await twentyMetadata(
        'application',
        `mutation AddColumn($input: CreateViewGroupInput!) { createViewGroup(input: $input) { id } }`,
        { input: { viewId, ...group } },
      ),
      'Add a board column',
    );
  },
  updateGroup: async (groupId, update) => {
    requireData(
      await twentyMetadata(
        'application',
        `mutation MoveColumn($input: UpdateViewGroupInput!) { updateViewGroup(input: $input) { id } }`,
        { input: { id: groupId, update } },
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
