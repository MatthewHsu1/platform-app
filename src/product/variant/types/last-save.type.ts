// Who saved a row last and when; the later staff save wins.
export type LastSave = {
  updatedAt?: string;
  updatedBy?: { source?: string | null } | null;
};
