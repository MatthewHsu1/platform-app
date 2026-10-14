// The English source of the notes the equipment serial rules write. Triggers translate them into the saver's
// language; the texts are listed for the translation extractor in
// src/fieldservice/actions/complete-order.front-component.tsx.
export const FIELDSERVICE_EQUIPMENT_STOCK_MESSAGES = {
  serialOfOtherProduct: 'This serial belongs to another product.',
  serialTaken: 'Other equipment already has this serial.',
} as const;
