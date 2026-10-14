import { describe, expect, it } from 'vitest';

import { planValidationRules } from 'src/fieldservice-stage-validation/utils/plan-validation-rules.util';

const row = (id: string, stage: string | null, requiredFields: string[] | null, otherFields: string | null = null) => ({ id, stage, requiredFields, otherFields });

describe('planValidationRules', () => {
  it('makes one rule for each field of a row, true outside the stage and a set field inside it', () => {
    const { rules } = planValidationRules([row('r1', 'COMPLETED', ['RESOLUTION', 'PERSON', 'SCHEDULED_DURATION', 'DATE_END'])], []);

    expect(rules).toEqual([
      {
        name: 'platform-stage-rule:r1:PERSON',
        expression: 'stage != "COMPLETED" or isDefined(person)',
        message: 'Cannot move to stage Completed until the Assigned to field is set.',
      },
      {
        name: 'platform-stage-rule:r1:SCHEDULED_DURATION',
        expression: 'stage != "COMPLETED" or scheduledDuration > 0',
        message: 'Cannot move to stage Completed until the Scheduled duration (hours) field is set.',
      },
      {
        name: 'platform-stage-rule:r1:RESOLUTION',
        expression: 'stage != "COMPLETED" or not isEmpty(resolution)',
        message: 'Cannot move to stage Completed until the Resolution field is set.',
      },
      {
        name: 'platform-stage-rule:r1:DATE_END',
        expression: 'stage != "COMPLETED" or not isEmpty(dateEnd)',
        message: 'Cannot move to stage Completed until the Actual end field is set.',
      },
    ]);
  });

  it('leaves the equipment and worker lists to code, and a row without a stage to nobody', () => {
    const { rules } = planValidationRules([row('r1', 'COMPLETED', ['EQUIPMENTS', 'PERSONS']), row('r2', null, ['TEAM'])], []);

    expect(rules).toEqual([]);
  });

  it('makes a rule for a field staff added, by its type, and reports the ones that cannot be checked', () => {
    const fieldInfo = [
      { name: 'warrantyNote', label: 'Warranty note', type: 'TEXT', isActive: true, settings: null },
      { name: 'customer', label: 'Customer', type: 'RELATION', isActive: true, settings: { relationType: 'MANY_TO_ONE', joinColumnName: 'customerId' } },
      { name: 'visits', label: 'Visits', type: 'RELATION', isActive: true, settings: { relationType: 'ONE_TO_MANY' } },
      { name: 'cost', label: 'Cost', type: 'CURRENCY', isActive: true, settings: null },
    ];
    const { rules, skipped } = planValidationRules([row('r1', 'SCHEDULED', null, 'warrantyNote customer visits cost nothing')], fieldInfo);

    expect(rules.map((rule) => rule.expression)).toEqual(['stage != "SCHEDULED" or not isEmpty(warrantyNote)', 'stage != "SCHEDULED" or isDefined(customer)']);
    expect(skipped).toEqual([
      { rowId: 'r1', name: 'visits', reason: 'a field of type RELATION cannot be checked' },
      { rowId: 'r1', name: 'cost', reason: 'a field of type CURRENCY cannot be checked' },
      { rowId: 'r1', name: 'nothing', reason: 'the service order has no such field' },
    ]);
  });
});
