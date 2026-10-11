export type PackageTypeSequencePlan =
  | { kind: 'none' }
  | { kind: 'create'; sequence: { name: string; code: string; prefix: string; padding: number } }
  | { kind: 'update'; sequenceId: string; data: { name: string; code: string; prefix: string } };
