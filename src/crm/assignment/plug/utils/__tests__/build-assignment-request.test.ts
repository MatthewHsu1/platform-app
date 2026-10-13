import { describe, expect, it } from 'vitest';

import { makeLead, makeMember, makeTeam } from 'src/crm/assignment/__tests__/fakes/fake-assignment-api';
import { buildAssignmentRequest } from 'src/crm/assignment/plug/utils/build-assignment-request.util';

describe('buildAssignmentRequest', () => {
  it('sends the run, the teams with their filters, the members with their quotas and the leads', () => {
    const request = buildAssignmentRequest({
      input: { teamIds: ['team-1'], forceQuota: false, creationDeltaDays: 7, door: 'SCHEDULE', requestedBy: null },
      now: new Date('2026-10-08T12:00:00.000Z'),
      delayHours: 0,
      teams: [makeTeam('team-1', { name: 'Sales', sequence: 0, useLeads: false, assignmentMax: 60, assignmentDomain: '{"combinator":"and","rules":[]}' })],
      members: [makeMember('member-1', 'team-1', 'wm-1', 30, { name: 'Ann Lee' })],
      quotas: new Map([['member-1', 1]]),
      dayCounts: new Map(),
      leads: [
        makeLead('lead-1', {
          name: 'Treadmill for gym',
          createdAt: '2026-10-08T09:00:00.000Z',
          priority: 'HIGH',
          probability: 10,
          stageId: 'stage-1',
          emailFrom: { primaryEmail: 'ann@example.com', additionalEmails: null },
          phone: { primaryPhoneNumber: '6145551234', primaryPhoneCountryCode: 'US', primaryPhoneCallingCode: '+1', additionalPhones: null },
          contactName: 'Ann Lee',
          partnerName: 'Acme Gym',
          personId: null,
          companyId: null,
          sourceId: null,
          mediumId: null,
          campaignId: null,
          tags: ['OTHER'],
          language: 'EN_US',
          contactAddress: { addressStreet1: '', addressStreet2: '', addressCity: '', addressPostcode: '', addressState: '', addressCountry: '' },
          expectedRevenue: { amountMicros: 0, currencyCode: 'USD' },
          referred: null,
          dateDeadline: null,
        }),
      ],
    });

    expect(request).toEqual({
      run: { door: 'SCHEDULE', forceQuota: false, creationDeltaDays: 7, delayHours: 0, now: '2026-10-08T12:00:00.000Z' },
      teams: [
        {
          id: 'team-1',
          name: 'Sales',
          sequence: 0,
          useLeads: false,
          useOpportunities: true,
          assignmentOptout: false,
          assignmentMax: 60,
          assignmentDomain: { combinator: 'and', rules: [] },
        },
      ],
      members: [
        {
          id: 'member-1',
          teamId: 'team-1',
          workspaceMemberId: 'wm-1',
          name: 'Ann Lee',
          assignmentOptout: false,
          assignmentMax: 30,
          quota: 1,
          leadDayCount: 0,
          assignmentDomain: null,
          assignmentDomainPreferred: null,
        },
      ],
      leads: [
        {
          id: 'lead-1',
          name: 'Treadmill for gym',
          createdAt: '2026-10-08T09:00:00.000Z',
          leadType: 'LEAD',
          wonStatus: 'PENDING',
          priority: 'HIGH',
          probability: 10,
          teamId: null,
          salespersonId: null,
          dateOpen: null,
          stageId: 'stage-1',
          email: 'ann@example.com',
          phone: { callingCode: '+1', number: '6145551234' },
          contactName: 'Ann Lee',
          partnerName: 'Acme Gym',
          personId: null,
          companyId: null,
          sourceId: null,
          mediumId: null,
          campaignId: null,
          tags: ['OTHER'],
          language: 'EN_US',
          address: { street1: '', street2: '', city: '', postcode: '', state: '', country: '' },
          expectedRevenue: { amountMicros: 0, currencyCode: 'USD' },
          referred: null,
          dateDeadline: null,
        },
      ],
    });
  });
});
