export type RuleMessageInput = {
  action: 'PULL' | 'PUSH' | 'PULL_PUSH';
  procureMethod: 'MAKE_TO_STOCK' | 'MAKE_TO_ORDER' | 'MTS_ELSE_MTO';
  locationDestFromRule: boolean;
  locationDestId: string | null;
  sourceName: string | null;
  destinationName: string | null;
  pickingType: { name: string; defaultLocationDestId: string | null; defaultLocationDestName: string | null } | null;
};
