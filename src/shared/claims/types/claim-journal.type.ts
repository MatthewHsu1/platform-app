export type ClaimJournal = {
  runId: string;
  resumed: boolean;
  // The run, or the stopped run it took over, had passed its commit point when the journal was opened.
  committed: boolean;
  step: <TPlan>(name: string, plan: () => Promise<TPlan>, work: (plan: TPlan) => Promise<void>) => Promise<TPlan>;
  // Called right before the run's first write. A run that throws before it frees the record; after it, the claim stays for resume.
  commit: () => Promise<void>;
};
