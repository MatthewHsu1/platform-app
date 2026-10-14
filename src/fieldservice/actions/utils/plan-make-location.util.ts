import { FIELDSERVICE_ACTION_MESSAGES } from 'src/fieldservice/actions/fieldservice-action-messages.constant';
import { type OrderActionPlan } from 'src/fieldservice/actions/types/order-action-plan.type';
import { type PartnerForLocation } from 'src/fieldservice/actions/types/partner-for-location.type';

// A contact or company gets one service location. Its owner is the contact's company, else the contact itself;
// when that company already has a location, the new one sits under it. A company owns its own location.
export const planMakeLocation = ({
  partner,
  hasLocation,
  companyLocationId,
}: {
  partner: PartnerForLocation;
  hasLocation: boolean;
  companyLocationId: string | null;
}): OrderActionPlan => {
  if (hasLocation) {
    return { kind: 'refuse', reason: FIELDSERVICE_ACTION_MESSAGES.locationExists };
  }
  if (partner.kind === 'company') {
    return { kind: 'write', data: { name: partner.name, partnerCompanyId: partner.id, ownerCompanyId: partner.id, address: partner.address } };
  }
  return {
    kind: 'write',
    data: {
      name: partner.name,
      partnerPersonId: partner.id,
      ...(partner.companyId === null ? { ownerPersonId: partner.id } : { ownerCompanyId: partner.companyId }),
      parentId: companyLocationId,
      email: partner.emails,
      phone: partner.phones,
    },
  };
};
