// What the scoring routes answer. English source texts, translated in the
// clicking user's language.
export const SCORING_MESSAGES = {
  onlyWorkspaceAdministrators: 'Only a workspace administrator can update the probabilities.',
  startDateRequired: 'Choose the day from which leads are counted.',
} as const;

// What the scoring explanation answers: its refusal, the quality values and
// the words of the example shown before there is enough history.
export const SCORING_FACTORS_MESSAGES = {
  notPending: 'Only an open lead has a scoring explanation.',
  correct: 'Correct',
  incorrect: 'Incorrect',
  notSet: 'Not set',
  sampleStage: 'New',
  sampleLowTag: 'Exploration',
  sampleTopTag: 'Consulting',
  sampleCountry: 'Belgium',
} as const;
