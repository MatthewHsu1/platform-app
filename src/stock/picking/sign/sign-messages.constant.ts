// The sign route refuses with these texts and writes the note in them, translated through the catalog.
export const SIGN_MESSAGES = {
  drawFirst: 'Draw the signature before you sign.',
  notFound: 'Transfer not found.',
  notAllowed: 'You are not allowed to change this transfer, so you cannot sign it.',
  onlyDeliveries: 'Only deliveries can be signed.',
  alreadySigned: 'This transfer is already signed.',
  timeZoneNotValid: 'Your time zone is not known. Check the time zone in your settings and sign again.',
  orderSignedBy: 'Order signed by {partner}',
  orderSigned: 'Order signed',
} as const;
