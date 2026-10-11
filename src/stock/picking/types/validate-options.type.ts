export type ValidateOptions = {
  // undefined: ask when a backorder is needed; true: answered "no backorder"; false: answered "create backorder".
  cancelBackorder?: boolean;
  skipExpired?: boolean;
  skipPreChecks?: boolean;
  pickingsToDetach?: string[];
  batchesToValidate?: string[];
  // The "No backorder" button: the less-quantities task goes on every transfer validated, not only the asked ones.
  logEveryTransfer?: boolean;
  // The caller runs the batch hook itself, once for a click that validates in several calls.
  skipBatchHook?: boolean;
};
