import { describe, expect, it } from 'vitest';

import { planRuleMessage } from 'src/stock/utils/plan-rule-message.util';

const receipts = { name: 'Receipts', defaultLocationDestId: 'stock', defaultLocationDestName: 'WH/Stock' };

describe('planRuleMessage', () => {
  it('explains a pull rule', () => {
    expect(
      planRuleMessage({
        action: 'PULL',
        procureMethod: 'MAKE_TO_STOCK',
        locationDestFromRule: false,
        locationDestId: 'stock',
        sourceName: 'Vendors',
        destinationName: 'WH/Stock',
        pickingType: receipts,
      }),
    ).toBe('When products are needed in WH/Stock, Receipts are created from Vendors to meet the need.');
  });

  it("says where the products go first when the operation type's destination differs", () => {
    const pick = { name: 'Pick', defaultLocationDestId: 'output', defaultLocationDestName: 'WH/Output' };

    expect(
      planRuleMessage({
        action: 'PULL',
        procureMethod: 'MAKE_TO_STOCK',
        locationDestFromRule: false,
        locationDestId: 'customers',
        sourceName: 'WH/Stock',
        destinationName: 'Customers',
        pickingType: pick,
      }),
    ).toBe(
      'When products are needed in Customers, Pick are created from WH/Stock to meet the need. The products go first to WH/Output, the destination set on Pick.',
    );
  });

  it('says nothing about a first stop when the operation type has no default destination', () => {
    const noDefault = { name: 'Pick', defaultLocationDestId: null, defaultLocationDestName: null };

    expect(
      planRuleMessage({
        action: 'PULL',
        procureMethod: 'MAKE_TO_STOCK',
        locationDestFromRule: false,
        locationDestId: 'customers',
        sourceName: 'WH/Stock',
        destinationName: 'Customers',
        pickingType: noDefault,
      }),
    ).toBe('When products are needed in Customers, Pick are created from WH/Stock to meet the need.');
  });

  it('adds the make-to-order and the take-from-stock-else-order sentences with the source', () => {
    const base = {
      action: 'PULL' as const,
      locationDestFromRule: true,
      locationDestId: 'customers',
      sourceName: 'WH/Stock',
      destinationName: 'Customers',
      pickingType: receipts,
    };

    expect(planRuleMessage({ ...base, procureMethod: 'MAKE_TO_ORDER' })).toContain(
      'A need is created in WH/Stock and another rule is triggered to meet it.',
    );
    expect(planRuleMessage({ ...base, procureMethod: 'MTS_ELSE_MTO' })).toContain(
      'If WH/Stock does not have the products, another rule is triggered to bring the missing quantity there.',
    );
  });

  it('explains a push rule, and joins both for pull and push', () => {
    const store = { name: 'Storage', defaultLocationDestId: 'stock', defaultLocationDestName: 'WH/Stock' };
    const base = {
      procureMethod: 'MAKE_TO_ORDER' as const,
      locationDestFromRule: false,
      locationDestId: 'stock',
      sourceName: null,
      destinationName: 'WH/Stock',
      pickingType: store,
    };

    expect(planRuleMessage({ ...base, action: 'PUSH', sourceName: 'WH/Input' })).toBe(
      'When products arrive in WH/Input, Storage are created to send them to WH/Stock.',
    );
    expect(planRuleMessage({ ...base, action: 'PULL_PUSH' })).toBe(
      'When products are needed in WH/Stock, Storage are created from Source Location to meet the need.\n\nWhen products arrive in Source Location, Storage are created to send them to WH/Stock.',
    );
  });
});
