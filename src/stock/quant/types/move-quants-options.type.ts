import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';

// `unpack` takes each row out of its package; otherwise a row stays in its
// package, and the containers whose whole content moves go along, up to the
// packages of `upToParentPackages`.
export type MoveQuantsOptions = {
  unpack?: boolean;
  upToParentPackages?: string[] | null;
  journal: ClaimJournal;
  stepPrefix: string;
};
