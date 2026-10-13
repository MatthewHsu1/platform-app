import { CaseActionError } from 'src/helpdesk/actions/case-action-error';
import { CASE_SELECTION, readCaseRow } from 'src/helpdesk/load-case-context';
import { type CaseRow } from 'src/helpdesk/types/case-row.type';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { hasMemberBehind, makeRouteHandler } from 'src/shared/route-handlers';
import { requireData, twentyGraphql, twentyMetadata } from 'src/shared/twenty-graphql';

// One-case routes take `caseId`, or the one selected id of a command.
export const readCaseIds = (body: Record<string, unknown>) =>
  Array.isArray(body.caseIds)
    ? [...new Set(body.caseIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
    : [];

export const readCaseId = (body: Record<string, unknown>) => {
  if (typeof body.caseId === 'string' && body.caseId.length > 0) {
    return body.caseId;
  }
  const caseIds = readCaseIds(body);

  return caseIds.length === 1 ? caseIds[0] : null;
};

// A case refusal answers with the status its error names.
export const caseRouteHandler = makeRouteHandler(readUserLocale, hasMemberBehind, (error) =>
  error instanceof CaseActionError ? error.status : 409,
);

// Reads as the clicking user, so a case their row rule hides is "not found". A read their role refuses, or one
// that fails, throws instead.
export const findCaseAsUser = async (caseId: string): Promise<CaseRow | null> => {
  const found = requireData(
    await twentyGraphql<{ helpdeskTickets: { edges: { node: Record<string, unknown> }[] } }>(
      'person',
      `query CaseForAction($id: UUID!) {
        helpdeskTickets(filter: { id: { eq: $id } }, first: 1) { edges { node { ${CASE_SELECTION} } } }
      }`,
      { id: caseId },
    ),
    'Read the work case',
  );
  const node = found.helpdeskTickets.edges[0]?.node;

  return node === undefined ? null : readCaseRow(node);
};

// Staff fields go in as the clicking user, so the save rules treat the change as the user's.
export const updateCaseAsUser = async (caseId: string, data: Record<string, unknown>) => {
  if (Object.keys(data).length === 0) {
    return;
  }
  requireData(
    await twentyGraphql(
      'person',
      `mutation UpdateCaseAsUser($id: UUID!, $data: HelpdeskTicketUpdateInput!) {
        updateHelpdeskTicket(id: $id, data: $data) { id }
      }`,
      { id: caseId, data },
    ),
    `Update work case ${caseId}`,
  );
};

// The clicking user's workspace member.
export const currentMemberId = async () => {
  const response = requireData(
    await twentyMetadata<{ currentUser: { workspaceMember: { id: string } | null } | null }>(
      'person',
      '{ currentUser { workspaceMember { id } } }',
    ),
    'Read the signed-in user',
  );

  return response.currentUser?.workspaceMember?.id ?? null;
};
