// The English source of the answers of the field service buttons. Routes translate them into the clicking user's
// language; the texts are listed for the translation extractor in complete-order.front-component.tsx.
export const FIELDSERVICE_ACTION_MESSAGES = {
  selectOneRecord: 'Select one record.',
  orderNotFound: 'Service order not found.',
  alreadyClosed: 'This order is already closed.',
  needsUser: 'You need the Field service level User or higher.',
  needsDispatcher: 'You need the Field service level Dispatcher or higher.',
  signOnlyCompleted: 'Only a completed order can be signed.',
  signerRequired: 'Type the name of the person who signs.',
  signedNoteTitle: 'Order signed',
  signedNoteBody: 'Order signed by {name}',
  partnerNotFound: 'Contact or company not found.',
  locationExists: 'A service location for this contact or company already exists.',
  workerExists: 'A field service worker for this contact already exists.',
  opportunityNotFound: 'Opportunity not found.',
  onlyOpportunity: 'Service orders are made from opportunities, not from leads.',
  opportunityNeedsLocation: 'Set the service location of the opportunity first.',
} as const;
