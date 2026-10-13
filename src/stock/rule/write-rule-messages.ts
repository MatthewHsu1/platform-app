import { stockLocations, stockPickingTypes, stockRules } from 'src/stock/routing-records';
import { planRuleMessage } from 'src/stock/utils/plan-rule-message.util';
import { type RuleMessageInput } from 'src/stock/utils/types/rule-message-input.type';

type RuleForMessage = Pick<RuleMessageInput, 'action' | 'procureMethod' | 'locationDestFromRule'> & {
  id: string;
  locationSrcId: string | null;
  locationDestId: string | null;
  pickingTypeId: string | null;
  ruleMessage: string | null;
};

const isPresent = (id: string | null): id is string => id !== null;

// Writes the explanation of each rule whose text changed.
export const writeRuleMessages = async (filter: Record<string, unknown>) => {
  const rules = await stockRules.find<RuleForMessage>(
    filter,
    'id action procureMethod locationDestFromRule locationSrcId locationDestId pickingTypeId ruleMessage',
  );

  if (rules.length === 0) {
    return;
  }
  const types = await stockPickingTypes.find<{ id: string; name: string; defaultLocationDestId: string | null }>(
    { id: { in: [...new Set(rules.map((rule) => rule.pickingTypeId).filter(isPresent))] } },
    'id name defaultLocationDestId',
  );
  const locationIds = new Set(
    [
      ...rules.flatMap((rule) => [rule.locationSrcId, rule.locationDestId]),
      ...types.map((type) => type.defaultLocationDestId),
    ].filter(isPresent),
  );
  const locations = await stockLocations.find<{ id: string; name: string; completeName: string | null }>(
    { id: { in: [...locationIds] } },
    'id name completeName',
  );
  const nameOf = (id: string | null) => {
    const location = id === null ? undefined : locations.find((candidate) => candidate.id === id);

    return location === undefined ? null : (location.completeName ?? location.name);
  };

  for (const rule of rules) {
    const type = types.find((candidate) => candidate.id === rule.pickingTypeId);
    const message = planRuleMessage({
      action: rule.action,
      procureMethod: rule.procureMethod,
      locationDestFromRule: rule.locationDestFromRule,
      locationDestId: rule.locationDestId,
      sourceName: nameOf(rule.locationSrcId),
      destinationName: nameOf(rule.locationDestId),
      pickingType:
        type === undefined
          ? null
          : {
              name: type.name,
              defaultLocationDestId: type.defaultLocationDestId,
              defaultLocationDestName: nameOf(type.defaultLocationDestId),
            },
    });

    if (message !== rule.ruleMessage) {
      await stockRules.update(rule.id, { ruleMessage: message });
    }
  }
};
