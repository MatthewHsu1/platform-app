import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

import { PHONE_STATE } from 'src/crm/crm-options.constant';
import { type PhonesValue } from 'src/crm/lead/types/phones-value.type';

// "+<calling code><national digits>": the form two numbers are compared in.
export const normalisePhone = (phone: PhonesValue | null) => {
  const digits = (phone?.primaryPhoneNumber ?? '').replace(/\D/g, '');

  if (digits === '') {
    return null;
  }
  const callingCode = (phone?.primaryPhoneCallingCode ?? '').replace(/\D/g, '');

  return `+${callingCode}${digits}`;
};

// The full numbering plan ("max" metadata) is needed to tell a valid number
// from a merely possible one.
export const phoneState = (phone: PhonesValue | null) => {
  const normalised = normalisePhone(phone);

  if (normalised === null) {
    return null;
  }

  return parsePhoneNumberFromString(normalised)?.isValid() === true ? PHONE_STATE.CORRECT : PHONE_STATE.INCORRECT;
};
