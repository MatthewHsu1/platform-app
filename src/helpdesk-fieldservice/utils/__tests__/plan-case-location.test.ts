import { describe, expect, it } from 'vitest';

import { planCaseLocation } from 'src/helpdesk-fieldservice/utils/plan-case-location.util';

const partner = (serviceLocationId: string | null, commercialServiceLocationId: string | null = null, commercialKey = 'company:other') => ({
  commercialKey,
  serviceLocationId,
  commercialServiceLocationId,
});

describe('planCaseLocation', () => {
  it('takes the primary service location of a contact whose customer differs from the case location', () => {
    expect(planCaseLocation({ partner: partner('otherLocation'), currentLocationKey: 'company:test' })).toBe('otherLocation');
  });

  it('takes the primary location of the contact company when the contact has none', () => {
    expect(planCaseLocation({ partner: partner(null, 'otherLocation'), currentLocationKey: 'company:test' })).toBe('otherLocation');
  });

  it('prefers the primary location of the contact over the one of its company', () => {
    expect(planCaseLocation({ partner: partner('mine', 'theirs'), currentLocationKey: null })).toBe('mine');
  });

  it('keeps the case location when the contact has no primary location at all', () => {
    expect(planCaseLocation({ partner: partner(null, null), currentLocationKey: 'company:test' })).toBeNull();
  });

  it('keeps the case location when it already belongs to the same customer', () => {
    expect(planCaseLocation({ partner: partner('otherLocation', null, 'company:test'), currentLocationKey: 'company:test' })).toBeNull();
  });

  it('keeps the case location when the case has no contact', () => {
    expect(planCaseLocation({ partner: null, currentLocationKey: 'company:test' })).toBeNull();
  });

  it('sets a location on a case that has none', () => {
    expect(planCaseLocation({ partner: partner('otherLocation'), currentLocationKey: null })).toBe('otherLocation');
  });
});
