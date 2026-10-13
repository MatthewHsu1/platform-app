import { translate } from 'src/shared/i18n/translate';
import { SIGN_MESSAGES } from 'src/stock/picking/sign/sign-messages.constant';

// The note names the transfer's own contact; no locale gives the English text.
export const orderSignedNote = (partnerName: string, locale: string | null = null) =>
  partnerName
    ? translate(locale, SIGN_MESSAGES.orderSignedBy, { partner: partnerName })
    : translate(locale, SIGN_MESSAGES.orderSigned);
