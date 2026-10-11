import { requireData, twentyGraphql, twentyMetadata } from 'src/shared/twenty-graphql';
import { StockUserError } from 'src/stock/stock-errors';
import { NOT_ALLOWED_MESSAGE } from 'src/shared/not-allowed';
import { STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/stock/stock-universal-identifiers.constant';

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
    throw new StockUserError(message);
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

// Some buttons belong to the inventory manager. Only a manager may edit warehouses, so that right
// tells a manager from a stock user.
export const requireStockManagerRight = () => requireUpdateRights([STOCK_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER]);
