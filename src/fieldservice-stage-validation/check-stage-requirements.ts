import { fsmEquipmentFsmOrderRels, fsmOrderFsmPersonRels, fsmOrders } from 'src/fieldservice/fieldservice-records';
import { loadStageRules } from 'src/fieldservice-stage-validation/load-stage-rules';
import { readOrderObject } from 'src/fieldservice-stage-validation/read-order-object';
import { type StageRequirementPlan } from 'src/fieldservice-stage-validation/types/stage-requirement-plan.type';
import { planStageRequirements } from 'src/fieldservice-stage-validation/utils/plan-stage-requirements.util';
import { requiredFieldsOf } from 'src/fieldservice-stage-validation/utils/required-fields-of.util';

export type StageCheck = { orderId: string; stage: string; changes?: Record<string, unknown> };

const countBy = (rows: { orderId: string }[]) => {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.orderId, (counts.get(row.orderId) ?? 0) + 1);
  }
  return counts;
};

// For each order, whether it holds every field the rows of its stage list, with `changes` applied on top of what
// is stored (a button's own write). The rule rows, the order's fields and the order itself are read now, with the
// app role. The lists of link rows are counted; `linksOnly` checks nothing else.
export const checkStageRequirements = async (checks: StageCheck[], { linksOnly }: { linksOnly: boolean }) => {
  const result = new Map<string, StageRequirementPlan>();

  if (checks.length === 0) {
    return result;
  }
  const rules = await loadStageRules([...new Set(checks.map((check) => check.stage))]);
  const { fields: fieldInfo } = await readOrderObject();
  const selections = new Set<string>();
  let needsLinks = false;

  for (const stage of new Set(checks.map((check) => check.stage))) {
    for (const field of requiredFieldsOf(
      rules.filter((rule) => rule.stage === stage),
      fieldInfo,
    ).fields) {
      needsLinks ||= field.check === 'link';
      if (field.selection !== '' && !linksOnly) {
        selections.add(field.selection);
      }
    }
  }
  const ids = checks.map((check) => check.orderId);
  const stored = new Map(
    (await fsmOrders.find<Record<string, unknown>>({ id: { in: ids } }, `id ${[...selections].join(' ')}`)).map((row) => [String(row.id), row]),
  );
  const equipments = needsLinks ? countBy(await fsmEquipmentFsmOrderRels.find<{ orderId: string }>({ orderId: { in: ids } }, 'orderId')) : new Map<string, number>();
  const persons = needsLinks ? countBy(await fsmOrderFsmPersonRels.find<{ orderId: string }>({ orderId: { in: ids } }, 'orderId')) : new Map<string, number>();

  for (const check of checks) {
    const values = {
      ...stored.get(check.orderId),
      equipments: equipments.get(check.orderId) ?? 0,
      persons: persons.get(check.orderId) ?? 0,
      ...check.changes,
    };

    result.set(check.orderId, planStageRequirements({ stage: check.stage, rules, values, fieldInfo, linksOnly }));
  }
  return result;
};
