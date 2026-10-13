export type VariantPlan =
  | { kind: 'refuse'; reason: string }
  | {
      kind: 'apply';
      create: string[][];
      activate: string[];
      extend: { variantId: string; templateAttributeValueIds: string[] }[];
      removeOrArchive: string[];
    };
