import { type RuleMessageInput } from 'src/stock/utils/types/rule-message-input.type';

// The plain-text explanation shown on a rule. It is record data written by a
// trigger, so it stays English.
export const planRuleMessage = (rule: RuleMessageInput) => {
  const source = rule.sourceName ?? 'Source Location';
  const destination = rule.destinationName ?? 'Destination Location';
  const operation = rule.pickingType?.name ?? 'Operation Type';
  const firstStop =
    rule.pickingType !== null && rule.pickingType.defaultLocationDestId !== rule.locationDestId
      ? rule.pickingType.defaultLocationDestName
      : null;
  const suffixes: string[] = [];

  if (rule.action !== 'PUSH' && firstStop !== null && !rule.locationDestFromRule) {
    suffixes.push(`The products go first to ${firstStop}, the destination set on ${operation}.`);
  }
  if (rule.procureMethod === 'MAKE_TO_ORDER' && rule.sourceName !== null) {
    suffixes.push(`A need is created in ${source} and another rule is triggered to meet it.`);
  }
  if (rule.procureMethod === 'MTS_ELSE_MTO' && rule.sourceName !== null) {
    suffixes.push(`If ${source} does not have the products, another rule is triggered to bring the missing quantity there.`);
  }
  const pull = [`When products are needed in ${destination}, ${operation} are created from ${source} to meet the need.`, ...suffixes].join(' ');
  const push = `When products arrive in ${source}, ${operation} are created to send them to ${destination}.`;

  if (rule.action === 'PULL') {
    return pull;
  }
  return rule.action === 'PUSH' ? push : `${pull}\n\n${push}`;
};
