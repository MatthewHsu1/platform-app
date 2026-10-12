import { leadSelection } from 'src/crm/lead/lead-selection';

const SCORING_LIST_FIELDS = ['tags', 'language'] as const;

// The scoring lists Twenty does not know, read from its refusal of a query
// that names them.
export const missingScoringFields = (error: unknown): string[] => {
  const message = error instanceof Error ? error.message : String(error);

  return SCORING_LIST_FIELDS.filter((field) => message.includes(`Cannot query field "${field}"`));
};

// Tags and language are staff lists the workspace owns: staff can delete or
// turn one off. A read that names a missing list is made once more without
// it, so the lead rules go on and scoring leaves that list out.
export const readWithScoringFields = async <TResult>(
  read: (selection: string) => Promise<TResult>,
  { withTeam }: { withTeam: boolean },
): Promise<TResult> => {
  try {
    return await read(leadSelection({ withTeam, withScoringFields: true }));
  } catch (error) {
    const missing = missingScoringFields(error);

    if (missing.length === 0) {
      throw error;
    }
    const kept = SCORING_LIST_FIELDS.filter((field) => !missing.includes(field));

    return read([leadSelection({ withTeam }), ...kept].join(' '));
  }
};
