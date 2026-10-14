import { describe, expect, it } from 'vitest';

import { planMakeLocation } from 'src/fieldservice/actions/utils/plan-make-location.util';
import { planMakeWorker } from 'src/fieldservice/actions/utils/plan-make-worker.util';

const contact = { kind: 'person' as const, id: 'ana', name: 'Ana Diaz', companyId: null, emails: { primaryEmail: 'ana@example.com' }, phones: null };

describe('planMakeLocation', () => {
  it('makes a contact without a company the owner of its own location', () => {
    expect(planMakeLocation({ partner: contact, hasLocation: false, companyLocationId: null })).toEqual({
      kind: 'write',
      data: { name: 'Ana Diaz', partnerPersonId: 'ana', ownerPersonId: 'ana', parentId: null, email: { primaryEmail: 'ana@example.com' }, phone: null },
    });
  });

  it("gives a contact's location to the contact's company and puts it under the company's location", () => {
    expect(planMakeLocation({ partner: { ...contact, companyId: 'gym' }, hasLocation: false, companyLocationId: 'gym-site' })).toMatchObject({
      kind: 'write',
      data: { ownerCompanyId: 'gym', parentId: 'gym-site' },
    });
  });

  it('lets a company own its own location', () => {
    expect(planMakeLocation({ partner: { kind: 'company', id: 'gym', name: 'City Gym', address: null }, hasLocation: false, companyLocationId: null })).toEqual({
      kind: 'write',
      data: { name: 'City Gym', partnerCompanyId: 'gym', ownerCompanyId: 'gym', locationAddress: null },
    });
  });

  it('refuses a second location for the same partner', () => {
    expect(planMakeLocation({ partner: contact, hasLocation: true, companyLocationId: null })).toEqual({
      kind: 'refuse',
      reason: 'A service location for this contact or company already exists.',
    });
  });
});

describe('planMakeWorker', () => {
  it('makes one worker per contact', () => {
    expect(planMakeWorker({ person: { id: 'ana', name: 'Ana Diaz' }, hasWorker: false })).toEqual({ kind: 'write', data: { name: 'Ana Diaz', partnerId: 'ana' } });
    expect(planMakeWorker({ person: { id: 'ana', name: 'Ana Diaz' }, hasWorker: true })).toEqual({
      kind: 'refuse',
      reason: 'A field service worker for this contact already exists.',
    });
  });
});
