import { type CaseLocationPartner } from 'src/helpdesk-fieldservice/types/case-location-partner.type';

// The service location a work case takes when its contact changes, or null to leave the case as it is. The
// location the case has stays when it already belongs to the same customer; else the contact's primary location,
// else its customer's. A case without a contact keeps its location.
export const planCaseLocation = ({
  partner,
  currentLocationKey,
}: {
  partner: CaseLocationPartner | null;
  currentLocationKey: string | null;
}): string | null => {
  if (partner === null || partner.commercialKey === currentLocationKey) {
    return null;
  }

  return partner.serviceLocationId ?? partner.commercialServiceLocationId;
};
