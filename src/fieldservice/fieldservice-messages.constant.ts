// The English source of the notes and refusals the field service rules write. Triggers translate them into the
// saver's language; the texts are listed for the translation extractor in
// src/fieldservice/actions/complete-order.front-component.tsx.
export const FIELDSERVICE_MESSAGES = {
  manualComplete: 'Only the Complete button moves a service order to Completed.',
  holiday: '{date} is a holiday: {name}.',
  noTeam: 'Create a field service team first.',
  deleteOnlyNew: 'You cannot delete this order: only an order in the New stage can be deleted.',
  locationOwnParent: 'A location cannot be its own parent.',
  equipmentOwnParent: 'Equipment cannot be its own parent.',
  warrantyDates: 'The warranty end must not be before the warranty start.',
  locationInUse: 'This location is used by service orders.',
  teamInUse: 'This team is used by service orders.',
} as const;
