// The English source of the notes and refusals the work case link writes. Triggers and routes translate them
// into the saver's language; the texts are listed for the translation extractor in
// src/helpdesk-fieldservice/actions/create-order.front-component.tsx.
export const HELPDESK_FIELDSERVICE_MESSAGES = {
  openOrders: 'Please complete all service orders related to this work case to close it.',
  caseNotFound: 'Work case not found.',
  orderHasNoCase: 'This service order has no work case.',
  caseAlreadyClosed: 'The work case is already closed.',
  ordersStillOpen: 'Some service orders of the work case are still open.',
  stageRequired: 'Choose the stage the work case moves to.',
  resolutionRequired: 'Type the resolution of the work case.',
} as const;
