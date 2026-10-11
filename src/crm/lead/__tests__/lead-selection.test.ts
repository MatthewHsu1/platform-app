import { describe, expect, it } from 'vitest';

import { leadSelection, readLeadRow } from 'src/crm/lead/lead-selection';

describe('leadSelection', () => {
  it('asks for the team once the lead has a team field', () => {
    expect(leadSelection({ withTeam: true }).split(' ')).toContain('teamId');
  });

  it('asks for tags and language only when scoring needs them', () => {
    expect(leadSelection({ withTeam: true, withScoringFields: true })).toContain('tags');
    expect(leadSelection({ withTeam: true, withScoringFields: true })).toContain('language');
  });
});

describe('readLeadRow', () => {
  it('reads money amounts sent as text as numbers', () => {
    const lead = readLeadRow({ id: 'l1', createdAt: '2026-10-09T10:00:00.000Z', expectedRevenue: { amountMicros: '1500000', currencyCode: 'USD' } });

    expect(lead.expectedRevenue).toEqual({ amountMicros: 1500000, currencyCode: 'USD' });
  });

  it('fills fields the row does not carry with empty values', () => {
    const lead = readLeadRow({ id: 'l1', createdAt: '2026-10-09T10:00:00.000Z' });

    expect(lead.teamId).toBeNull();
    expect(lead.probability).toBeNull();
    expect(lead.tags).toBeNull();
    expect(lead.isRotting).toBeNull();
  });

  it('keeps a probability of zero', () => {
    expect(readLeadRow({ id: 'l1', createdAt: 'x', probability: 0 }).probability).toBe(0);
  });

  it('reads an empty text as no value', () => {
    expect(readLeadRow({ id: 'l1', createdAt: 'x', name: '', contactName: '' }).name).toBeNull();
  });
});
