export type ViewFilterSpec = {
  fieldName: string;
  operand: 'IS' | 'IS_NOT';
  // An option list, a yes/no value, or "the signed-in member" for a relation.
  value: string[] | boolean | 'CURRENT_MEMBER';
};
