// Why a stored filter cannot be turned into a search. English source texts;
// the caller translates them, with the field label as `field`.
export const FILTER_ERROR_MESSAGES = {
  invalidJson: 'The filter is not valid JSON.',
  noConditions: 'The filter has no list of conditions.',
  unknownField: 'Unknown field "{field}".',
  operatorNotAllowed: '"{field}" cannot use "{operator}".',
  needsValue: '"{field}" needs a value.',
  needsNumber: '"{field}" needs a number.',
  needsTwoNumbers: '"{field}" needs two numbers.',
  needsDate: '"{field}" needs a date.',
  needsTwoDates: '"{field}" needs two dates.',
} as const;
