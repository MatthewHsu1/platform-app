import { NOT_ALLOWED_MESSAGE } from 'src/shared/not-allowed';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';
import { UserError } from 'src/shared/user-error';

type ObjectRights = { canUpdateObjectRecords: boolean; canSoftDeleteObjectRecords: boolean };

type RightsAnswer = {
  currentUser: {
    currentUserWorkspace: { objectsPermissions: ({ objectMetadataId: string } & Partial<ObjectRights>)[] } | null;
  } | null;
  objects: { edges: { node: { id: string; universalIdentifier: string } }[] };
};

// The clicking user's role rights, by object universal id.
const readObjectRights = async () => {
  const data = requireData(
    await twentyMetadata<RightsAnswer>(
      'person',
      `{
        currentUser { currentUserWorkspace { objectsPermissions { objectMetadataId canUpdateObjectRecords canSoftDeleteObjectRecords } } }
        objects(paging: { first: 1000 }) { edges { node { id universalIdentifier } } }
      }`,
    ),
    'Read object rights',
  );
  const universalIdentifierOf = new Map(data.objects.edges.map(({ node }) => [node.id, node.universalIdentifier]));
  const rights = new Map<string, ObjectRights>();

  for (const permission of data.currentUser?.currentUserWorkspace?.objectsPermissions ?? []) {
    const universalIdentifier = universalIdentifierOf.get(permission.objectMetadataId);

    if (universalIdentifier !== undefined) {
      rights.set(universalIdentifier, {
        canUpdateObjectRecords: permission.canUpdateObjectRecords === true,
        canSoftDeleteObjectRecords: permission.canSoftDeleteObjectRecords === true,
      });
    }
  }

  return rights;
};

const hasRight = async (right: keyof ObjectRights, objectUniversalIdentifiers: string[]) => {
  const rights = await readObjectRights();

  return objectUniversalIdentifiers.every((id) => rights.get(id)?.[right] === true);
};

const requireRight = async (right: keyof ObjectRights, objectUniversalIdentifiers: string[], message: string) => {
  if (!(await hasRight(right, objectUniversalIdentifiers))) {
    throw new UserError(message);
  }
};

// Whether a report should offer its buttons that change records.
export const hasUpdateRights = (objectUniversalIdentifiers: string[]) =>
  hasRight('canUpdateObjectRecords', objectUniversalIdentifiers);

// A button whose writes run with the app token checks the clicking user's role before its first
// write, so it does nothing the user could not do by hand.
export const requireUpdateRights = (objectUniversalIdentifiers: string[], message: string = NOT_ALLOWED_MESSAGE) =>
  requireRight('canUpdateObjectRecords', objectUniversalIdentifiers, message);

export const requireDeleteRights = (objectUniversalIdentifiers: string[], message: string = NOT_ALLOWED_MESSAGE) =>
  requireRight('canSoftDeleteObjectRecords', objectUniversalIdentifiers, message);
