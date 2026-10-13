import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';

// The same journal with every step name under a prefix, so a flow run inside
// another flow's step keeps its steps apart from the caller's own.
export const prefixedJournal = (journal: ClaimJournal, prefix: string): ClaimJournal => ({
  ...journal,
  step: (name, plan, work) => journal.step(`${prefix}:${name}`, plan, work),
});
