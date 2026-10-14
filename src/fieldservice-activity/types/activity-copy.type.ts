// The values of a new checklist item copied from a template item. A copy always starts to do.
export type ActivityCopy = {
  name: string | null;
  required: boolean;
  sequence: number;
  ref: string | null;
  state: 'TODO';
};
