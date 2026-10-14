import { describe, expect, it } from 'vitest';

import { planDescription } from 'src/fieldservice/utils/plan-description.util';

describe('planDescription', () => {
  it('fills an empty description with the notes of every equipment that has some', () => {
    expect(planDescription(null, ['Belt worn', null, '', 'Motor hums'])).toBe('Belt worn\n\nMotor hums');
  });

  it('keeps a description staff wrote', () => {
    expect(planDescription('Customer reports noise', ['Belt worn'])).toBeNull();
  });

  it('writes nothing when no equipment has notes', () => {
    expect(planDescription('', [null])).toBeNull();
  });
});
