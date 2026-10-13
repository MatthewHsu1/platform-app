import { describe, expect, it } from 'vitest';

import { PRODUCT_INSTALL } from 'src/product/product-install';
import { UOM_INSTALL } from 'src/uom/uom-install';

describe('validation rules of the products modules', () => {
  const rules = [...UOM_INSTALL.validationRules, ...PRODUCT_INSTALL.validationRules];

  it('has unique names that start with platform-', () => {
    const names = rules.map((rule) => rule.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((name) => name.startsWith('platform-'))).toBe(true);
  });
});
