import { FieldserviceActionError } from 'src/fieldservice/actions/fieldservice-action-error';
import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import { holdsFieldServiceLevel } from 'src/fieldservice/actions/utils/holds-field-service-level.util';
import { readCallerAccess } from 'src/roles/read-caller-access';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { hasMemberBehind, makeRouteHandler } from 'src/shared/route-handlers';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';
import { capitalize } from 'src/shared/utils/capitalize.util';

// A field service refusal answers with the status its error names.
export const fieldserviceRouteHandler = makeRouteHandler(readUserLocale, hasMemberBehind, (error) =>
  error instanceof FieldserviceActionError ? error.status : 409,
);

// One-record routes take `recordId`, or the one selected id of a command.
export const readRecordId = (body: Record<string, unknown>) => {
  if (typeof body.recordId === 'string' && body.recordId.length > 0) {
    return body.recordId;
  }
  const ids = Array.isArray(body.recordIds) ? [...new Set(body.recordIds.filter((id): id is string => typeof id === 'string' && id !== ''))] : [];

  if (ids.length !== 1) {
    throw new FieldserviceActionError(FIELDSERVICE_ACTION_MESSAGES.selectOneRecord, {}, 400);
  }
  return ids[0];
};

// Reads one record as the clicking user, so a record their role or row rule hides is "not found".
export const findAsUser = async <TRecord>(objectSingular: string, objectPlural: string, id: string, selection: string): Promise<TRecord | null> => {
  const found = requireData(
    await twentyGraphql<Record<string, { edges: { node: TRecord }[] }>>(
      'person',
      `query FindForAction($id: UUID!) { ${objectPlural}(filter: { id: { eq: $id } }, first: 1) { edges { node { ${selection} } } } }`,
      { id },
    ),
    `Read ${objectSingular}`,
  );

  return found[objectPlural].edges[0]?.node ?? null;
};

// Writes as the clicking user, so their rights apply and the triggers treat the change as theirs.
export const updateAsUser = async (objectSingular: string, id: string, data: Record<string, unknown>) => {
  requireData(
    await twentyGraphql(
      'person',
      `mutation UpdateForAction($id: UUID!, $data: ${capitalize(objectSingular)}UpdateInput!) { update${capitalize(objectSingular)}(id: $id, data: $data) { id } }`,
      { id, data },
    ),
    `Update ${objectSingular} ${id}`,
  );
};

// Creates as the clicking user, so their rights apply and the triggers treat the record as theirs.
export const createAsUser = async (objectSingular: string, data: Record<string, unknown>) =>
  requireData(
    await twentyGraphql<Record<string, { id: string }>>(
      'person',
      `mutation CreateForAction($data: ${capitalize(objectSingular)}CreateInput!) { create${capitalize(objectSingular)}(data: $data) { id } }`,
      { data },
    ),
    `Create ${objectSingular}`,
  )[`create${capitalize(objectSingular)}`];

// The clicking user must hold this field service level, or be the workspace admin.
export const requireFieldServiceLevel = async (level: 'fieldService.user' | 'fieldService.dispatcher') => {
  if (!holdsFieldServiceLevel(await readCallerAccess(), level)) {
    throw new FieldserviceActionError(
      level === 'fieldService.user' ? FIELDSERVICE_ACTION_MESSAGES.needsUser : FIELDSERVICE_ACTION_MESSAGES.needsDispatcher,
    );
  }
};
