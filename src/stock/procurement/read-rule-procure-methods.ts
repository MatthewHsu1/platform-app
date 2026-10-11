import { stockMoves, stockRules } from 'src/stock/routing-records';
import { type RuleProcureMethod } from 'src/stock/types/rule-procure-method.type';

// The procure method of the rule each move came from (moves made by hand have none).
export const readRuleProcureMethods = async (moveIds: string[]): Promise<Map<string, RuleProcureMethod>> => {
  if (moveIds.length === 0) {
    return new Map();
  }
  const moves = await stockMoves.find<{ id: string; ruleId: string | null }>({ id: { in: moveIds } }, 'id ruleId');
  const ruleIds = [...new Set(moves.flatMap((move) => move.ruleId ?? []))];
  const rules =
    ruleIds.length === 0
      ? []
      : await stockRules.find<{ id: string; procureMethod: RuleProcureMethod }>({ id: { in: ruleIds } }, 'id procureMethod');
  const methodByRule = new Map(rules.map((rule) => [rule.id, rule.procureMethod]));

  return new Map(
    moves.flatMap((move) => {
      const method = methodByRule.get(move.ruleId ?? '');
      return method === undefined ? [] : [[move.id, method] as const];
    }),
  );
};
