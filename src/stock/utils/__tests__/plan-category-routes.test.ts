import { describe, expect, it } from 'vitest';

import { planCategoryRoutes } from 'src/stock/utils/plan-category-routes.util';

const categories = [
  { id: 'goods', parentId: null },
  { id: 'parts', parentId: 'goods' },
  { id: 'belts', parentId: 'parts' },
  { id: 'services', parentId: null },
];
const links = [
  { productCategoryId: 'goods', stockRouteId: 'mto' },
  { productCategoryId: 'parts', stockRouteId: 'buy' },
  { productCategoryId: 'belts', stockRouteId: 'mto' },
  { productCategoryId: 'belts', stockRouteId: 'crossdock' },
];

describe('planCategoryRoutes', () => {
  it("gives each category its own routes and its ancestors' routes it does not have", () => {
    const plan = planCategoryRoutes({ categoryIds: ['goods'], categories, links, existing: [] });

    expect(plan.creates).toEqual([
      { productCategoryId: 'goods', stockRouteId: 'mto', inherited: false },
      { productCategoryId: 'parts', stockRouteId: 'buy', inherited: false },
      { productCategoryId: 'parts', stockRouteId: 'mto', inherited: true },
      { productCategoryId: 'belts', stockRouteId: 'mto', inherited: false },
      { productCategoryId: 'belts', stockRouteId: 'crossdock', inherited: false },
      { productCategoryId: 'belts', stockRouteId: 'buy', inherited: true },
    ]);
  });

  it('touches only the given categories and the ones under them', () => {
    const plan = planCategoryRoutes({ categoryIds: ['belts'], categories, links, existing: [] });

    expect(new Set(plan.creates.map((row) => row.productCategoryId))).toEqual(new Set(['belts']));
  });

  it('writes nothing when the rows are right, and fixes the ones that are not', () => {
    const right = planCategoryRoutes({ categoryIds: ['parts'], categories, links, existing: [] }).creates.map(
      (row, index) => ({ ...row, id: `r${index}` }),
    );

    expect(planCategoryRoutes({ categoryIds: ['parts'], categories, links, existing: right })).toEqual({
      creates: [],
      updates: [],
      destroys: [],
    });

    const stale = [
      ...right.map((row) =>
        row.stockRouteId === 'mto' && row.productCategoryId === 'parts' ? { ...row, inherited: false } : row,
      ),
      { id: 'gone', productCategoryId: 'parts', stockRouteId: 'old', inherited: false },
    ];
    expect(planCategoryRoutes({ categoryIds: ['parts'], categories, links, existing: stale })).toEqual({
      creates: [],
      updates: [
        {
          id: right.find((row) => row.productCategoryId === 'parts' && row.stockRouteId === 'mto')!.id,
          inherited: true,
        },
      ],
      destroys: ['gone'],
    });
  });

  it('keeps one total row per route and removes the copies', () => {
    const existing = [
      { id: 'own', productCategoryId: 'goods', stockRouteId: 'mto', inherited: false },
      { id: 'copy', productCategoryId: 'goods', stockRouteId: 'mto', inherited: false },
    ];

    expect(planCategoryRoutes({ categoryIds: ['goods'], categories: [{ id: 'goods', parentId: null }], links, existing })).toEqual({
      creates: [],
      updates: [],
      destroys: ['copy'],
    });
  });

  it('leaves categories that are their own ancestor alone and handles the others', () => {
    const looped = [
      { id: 'goods', parentId: null },
      { id: 'left', parentId: 'right' },
      { id: 'right', parentId: 'left' },
    ];
    const loopLinks = [...links, { productCategoryId: 'left', stockRouteId: 'buy' }];

    expect(planCategoryRoutes({ categoryIds: ['left', 'goods'], categories: looped, links: loopLinks, existing: [] }).creates).toEqual([
      { productCategoryId: 'goods', stockRouteId: 'mto', inherited: false },
    ]);
  });
});
