import { defineLogicFunction } from 'twenty-sdk/define';

import { CaseActionError } from 'src/helpdesk/actions/case-action-error';
import { caseRouteHandler, findCaseAsUser, readCaseIds } from 'src/helpdesk/actions/case-action-route';
import { copyCase } from 'src/helpdesk/actions/copy-case';
import { HELPDESK_ACTION_MESSAGES } from 'src/helpdesk/actions/helpdesk-action-messages.constant';
import {
  DUPLICATE_CASES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  DUPLICATE_CASES_ROUTE_PATH,
} from 'src/helpdesk/actions/helpdesk-actions-universal-identifiers.constant';
import {
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { HELPDESK_TICKET_RELATED_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/helpdesk-ticket-related/helpdesk-ticket-related-universal-identifiers.constant';
import { requireUpdateRights } from 'src/shared/object-rights';
import { requireData, twentyGraphql } from 'src/shared/twenty-graphql';

const readLinkIds = async (caseId: string) => {
  const found = requireData(
    await twentyGraphql<{
      helpdeskTicketTagRels: { edges: { node: { tagId: string } }[] };
      helpdeskTicketRelateds: { edges: { node: { relatedTicketId: string } }[] };
    }>(
      'person',
      `query LinksOfCase($caseId: UUID!) {
        helpdeskTicketTagRels(filter: { ticketId: { eq: $caseId } }, first: 200) { edges { node { tagId } } }
        helpdeskTicketRelateds(filter: { ticketId: { eq: $caseId } }, first: 200) { edges { node { relatedTicketId } } }
      }`,
      { caseId },
    ),
    'Read the links of a work case',
  );

  return {
    tagIds: found.helpdeskTicketTagRels.edges.map(({ node }) => node.tagId),
    relatedTicketIds: found.helpdeskTicketRelateds.edges.map(({ node }) => node.relatedTicketId),
  };
};

// Reads as the clicking user; the copies are written with the app token, so the user's right to change
// cases and their links is checked before the first write. A case the user cannot read is left out.
const handler = caseRouteHandler(async (body) => {
  const caseIds = readCaseIds(body);

  if (caseIds.length === 0) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.selectSomeCases, {}, 400);
  }
  await requireUpdateRights([
    HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
    HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
    HELPDESK_TICKET_RELATED_OBJECT_UNIVERSAL_IDENTIFIER,
  ]);
  const copies: { from: string; to: string }[] = [];

  for (const caseId of caseIds) {
    const original = await findCaseAsUser(caseId);

    if (original !== null) {
      copies.push({ from: caseId, to: await copyCase(original, await readLinkIds(caseId)) });
    }
  }
  if (copies.length === 0) {
    throw new CaseActionError(HELPDESK_ACTION_MESSAGES.noCasesReadable);
  }

  return { copies };
});

export default defineLogicFunction({
  universalIdentifier: DUPLICATE_CASES_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'duplicate-work-cases',
  description: 'Copies the selected work cases with their tags and related cases.',
  timeoutSeconds: 300,
  handler,
  httpRouteTriggerSettings: {
    path: DUPLICATE_CASES_ROUTE_PATH,
    httpMethod: 'POST',
    isAuthRequired: true,
  },
});
