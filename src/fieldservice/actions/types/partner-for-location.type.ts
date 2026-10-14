// A contact or a company a service location is made from.
export type PartnerForLocation =
  | { kind: 'person'; id: string; name: string; companyId: string | null; emails: unknown; phones: unknown }
  | { kind: 'company'; id: string; name: string; address: unknown };
