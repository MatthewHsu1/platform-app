import { requireData, twentyGraphql, twentyMetadata } from 'src/shared/twenty-graphql';

const capitalize = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
const PAGE_SIZE = 200;

// The clicking user's row rules decide what a button may touch: ids they
// cannot read are dropped, as if they did not exist.
export const filterReadableIds = async (objectSingular: string, objectPlural: string, ids: string[]) => {
  const wanted = [...new Set(ids)];
  const readable = new Set<string>();

  for (let start = 0; start < wanted.length; start += PAGE_SIZE) {
    const part = wanted.slice(start, start + PAGE_SIZE);
    const data = requireData(
      await twentyGraphql<Record<string, { edges: { node: { id: string } }[] }>>(
        'person',
        `query Readable($filter: ${capitalize(objectSingular)}FilterInput) {
          ${objectPlural}(filter: $filter, first: ${PAGE_SIZE}) { edges { node { id } } }
        }`,
        { filter: { id: { in: part } } },
      ),
      `Read ${objectPlural}`,
    );
    data[objectPlural].edges.forEach(({ node }) => readable.add(node.id));
  }

  return wanted.filter((id) => readable.has(id));
};

type UpdateRights = {
  currentUser: {
    currentUserWorkspace: { objectsPermissions: { objectMetadataId: string; canUpdateObjectRecords: boolean }[] } | null;
  } | null;
  objects: { edges: { node: { id: string; universalIdentifier: string } }[] };
};

// Whether the clicking user's role may change records of the object. A button whose writes run
// with the app token checks this first, so it does nothing the user could not do by hand.
export const canUpdateRecordsOf = async (objectUniversalIdentifier: string) => {
  const data = requireData(
    await twentyMetadata<UpdateRights>(
      'person',
      `{
        currentUser { currentUserWorkspace { objectsPermissions { objectMetadataId canUpdateObjectRecords } } }
        objects(paging: { first: 1000 }) { edges { node { id universalIdentifier } } }
      }`,
    ),
    'Read update rights',
  );
  const objectId = data.objects.edges.find(({ node }) => node.universalIdentifier === objectUniversalIdentifier)?.node.id;

  return (data.currentUser?.currentUserWorkspace?.objectsPermissions ?? []).some(
    (permission) => permission.objectMetadataId === objectId && permission.canUpdateObjectRecords,
  );
};
