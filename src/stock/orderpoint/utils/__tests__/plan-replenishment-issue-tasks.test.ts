import { describe, expect, it } from 'vitest';

import { type OrderpointFailure } from 'src/stock/orderpoint/types/orderpoint-failure.type';
import { type ProductTask } from 'src/stock/orderpoint/types/product-task.type';
import { planReplenishmentIssueTasks } from 'src/stock/orderpoint/utils/plan-replenishment-issue-tasks.util';

const NO_RULE_SOURCE =
  'No rule has been found to replenish "{product}" in "{location}".\nVerify the routes configuration on the product.';
const NO_RULE = 'No rule has been found to replenish "Desk Combination" in "WH/Stock".\nVerify the routes configuration on the product.';

const failure = (orderpointId: string, productTemplateId: string): OrderpointFailure => ({
  orderpointId,
  productTemplateId,
  productName: 'Desk Combination',
  responsibleId: 'member-1',
  error: { message: NO_RULE_SOURCE, values: { product: 'Desk Combination', location: 'WH/Stock' } },
});

const plan = (failures: OrderpointFailure[], existing: ProductTask[] = []) =>
  planReplenishmentIssueTasks({ failures, tasksByTemplate: new Map([['t1', existing]]) });

const finished = (body: string, id = 'task-done'): ProductTask => ({ id, body, open: false });
const open = (body: string, id = 'task-open'): ProductTask => ({ id, body, open: true });

describe('planReplenishmentIssueTasks', () => {
  it('makes one task per product and error text, assigned to the product responsible', () => {
    expect(plan([failure('op1', 't1')])).toEqual([
      {
        id: expect.any(String),
        productTemplateId: 't1',
        title: 'Replenishment issue: Desk Combination',
        body: NO_RULE,
        assigneeId: 'member-1',
      },
    ]);
  });

  it('skips a product that already has an open task with the same text', () => {
    expect(plan([failure('op1', 't1')], [open(NO_RULE)])).toEqual([]);
  });

  it('skips a product whose open task holds the text among other lines', () => {
    expect(plan([failure('op1', 't1')], [open(`Ordered by phone.\n\n${NO_RULE}`)])).toEqual([]);
  });

  it('still makes the task when the open task of the product says something else', () => {
    expect(plan([failure('op1', 't1')], [open('Check the vendor price.')])).toHaveLength(1);
  });

  it('makes one task when two rules of the same product fail with the same text', () => {
    expect(plan([failure('op1', 't1'), failure('op2', 't1')])).toHaveLength(1);
  });

  it('leaves the task unassigned when the product has no responsible', () => {
    const [task] = plan([{ ...failure('op1', 't1'), responsibleId: null }]);
    expect(task.assigneeId).toBeNull();
  });

  it('gives a rerun the same task id, so a run that stopped half-way finds the task it made', () => {
    expect(plan([failure('op1', 't1')], [finished(NO_RULE)])[0].id).toBe(plan([failure('op1', 't1')], [finished(NO_RULE)])[0].id);
  });

  it('keeps the same task id when an unrelated task is added to the product in between', () => {
    expect(plan([failure('op1', 't1')], [finished(NO_RULE), open('Check the vendor price.')])[0].id).toBe(
      plan([failure('op1', 't1')], [finished(NO_RULE)])[0].id,
    );
  });

  it('makes a new task when the same issue comes back after its task was finished', () => {
    expect(plan([failure('op1', 't1')], [finished(NO_RULE)])[0].id).not.toBe(plan([failure('op1', 't1')])[0].id);
  });

  it('makes a new task when an earlier task with the same text was removed for good', () => {
    const idOfSecond = plan([failure('op1', 't1')], [finished(NO_RULE, 'first')])[0].id;

    expect(plan([failure('op1', 't1')], [finished(NO_RULE, idOfSecond)])[0].id).not.toBe(idOfSecond);
  });
});
