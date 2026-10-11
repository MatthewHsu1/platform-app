import { describe, expect, it } from 'vitest';

import { planLessQuantityTasks } from 'src/stock/utils/plan-less-quantity-tasks.util';

describe('planLessQuantityTasks', () => {
  it('puts one task on each following transfer for its product responsible, with the impacted transfers further down', () => {
    expect(
      planLessQuantityTasks({
        digits: 2,
        origins: [
          {
            pickingName: 'WH/PICK/00001',
            productName: 'Belt',
            uomName: 'Units',
            demand: 5,
            pickedQuantity: 3,
            destinations: [{ pickingId: 'out1', responsibleId: 'u1', downstreamPickingNames: ['WH/RET/00001'] }],
          },
          {
            pickingName: 'WH/PICK/00001',
            productName: 'Pulley',
            uomName: 'Units',
            demand: 2,
            pickedQuantity: 2,
            destinations: [{ pickingId: 'out1', responsibleId: 'u1', downstreamPickingNames: [] }],
          },
          {
            pickingName: 'WH/PICK/00001',
            productName: 'Strap',
            uomName: 'Units',
            demand: 4,
            pickedQuantity: 0,
            destinations: [],
          },
        ],
      }),
    ).toEqual([
      {
        pickingId: 'out1',
        assigneeId: 'u1',
        originPickingName: 'WH/PICK/00001',
        exceptions: [{ productName: 'Belt', uomName: 'Units', newQuantity: 3, oldQuantity: 5 }],
        impactedPickingNames: ['WH/RET/00001'],
      },
    ]);
  });

  it('splits one following transfer by product responsible', () => {
    const tasks = planLessQuantityTasks({
      digits: 2,
      origins: [
        { pickingName: 'IN1', productName: 'A', uomName: 'Units', demand: 2, pickedQuantity: 1, destinations: [{ pickingId: 'x', responsibleId: 'u1', downstreamPickingNames: [] }] },
        { pickingName: 'IN1', productName: 'B', uomName: 'Units', demand: 2, pickedQuantity: 1, destinations: [{ pickingId: 'x', responsibleId: null, downstreamPickingNames: [] }] },
      ],
    });

    expect(tasks.map((task) => [task.pickingId, task.assigneeId])).toEqual([
      ['x', 'u1'],
      ['x', null],
    ]);
  });
});
