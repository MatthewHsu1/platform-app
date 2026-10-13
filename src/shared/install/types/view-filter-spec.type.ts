export type ViewFilterSpec = {
  fieldName: string;
  operand: 'IS' | 'IS_NOT' | 'IS_EMPTY' | 'IS_IN_PAST';
  // An option list, a yes/no value, or "the signed-in member" for a relation. A filter that takes no value
  // (is empty, is in the past) gives an empty list.
  value: string[] | boolean | 'CURRENT_MEMBER';
};
