import { describe, expect, it } from 'vitest';

import { normalisePhone, phoneState } from 'src/crm/lead/utils/phone.util';

const phone = (callingCode: string, number: string) => ({
  primaryPhoneNumber: number,
  primaryPhoneCountryCode: null,
  primaryPhoneCallingCode: callingCode,
  additionalPhones: null,
});

describe('normalisePhone', () => {
  it('joins the calling code and the national digits', () => {
    expect(normalisePhone(phone('+1', '(650) 253-0000'))).toBe('+16502530000');
  });

  it('has no value without a number', () => {
    expect(normalisePhone(phone('+1', ''))).toBeNull();
    expect(normalisePhone(null)).toBeNull();
  });
});

describe('phoneState', () => {
  it('is empty without a number', () => {
    expect(phoneState(null)).toBeNull();
  });

  it('is correct for a valid number', () => {
    expect(phoneState(phone('+1', '6502530000'))).toBe('CORRECT');
  });

  it('is incorrect for a number the numbering plan does not allow', () => {
    expect(phoneState(phone('+1', '1234567890'))).toBe('INCORRECT');
  });
});
