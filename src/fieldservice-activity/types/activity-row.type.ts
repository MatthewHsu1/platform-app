// One checklist item as the triggers and buttons read it.
export type ActivityRow = {
  id: string;
  name: string | null;
  required: boolean | null;
  sequence: number | null;
  ref: string | null;
  state: string | null;
  createdAt: string;
};
