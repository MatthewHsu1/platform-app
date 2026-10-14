import { type UniqueNamePlan } from 'src/fieldservice/types/unique-name-plan.type';

const isBlank = (name: string | null) => name === null || name.trim() === '';

// Two rows of one table may not share a name. A blank name is never a duplicate, so a new row saved before its
// name is typed passes. A new row that takes a used name loses it; a renamed row gets its old name back.
export const planUniqueName = ({
  name,
  beforeName,
  isCreate,
  otherNames,
}: {
  name: string | null;
  beforeName: string | null;
  isCreate: boolean;
  otherNames: (string | null)[];
}): UniqueNamePlan => {
  if (isBlank(name) || !otherNames.includes(name)) {
    return { kind: 'keep' };
  }
  return { kind: 'putBack', name: isCreate ? null : beforeName };
};
