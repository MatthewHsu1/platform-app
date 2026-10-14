// The English source of the answers of the checklist buttons and of the Complete guard. Routes translate them into
// the clicking user's language; the texts are listed for the translation extractor in
// actions/activity-done.front-component.tsx.
export const FIELDSERVICE_ACTIVITY_MESSAGES = {
  requiredActivity: "You must complete activity '{name}' before completing this order.",
  activityNotFound: 'Service activity not found.',
  alreadyHandled: 'This activity is already completed or cancelled.',
  notOrderActivity: 'Only an activity of a service order can be completed or cancelled.',
} as const;
