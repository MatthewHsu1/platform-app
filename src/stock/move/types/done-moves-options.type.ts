import { type ClaimJournal } from 'src/shared/claims/types/claim-journal.type';

export type DoneMovesOptions = {
  cancelBackorder: boolean;
  journal: ClaimJournal;
  stepPrefix: string;
  skipPackageHistory?: boolean;
  // The other transfers validated in the same click: stock they are still to move counts where it goes when
  // packages are put in their containers.
  siblingPickingIds?: string[];
  moveDate?: string | null;
  // Default: some done move belongs to an incoming or internal transfer. Validate leaves it off and
  // retries after its backorder; a count retries the waiting moves itself when it finishes.
  retryWaiting?: boolean;
};
