// Expiry fields this module adds to products, lots, stock levels and move lines.
export const PRODUCT_EXPIRY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  templateUseExpirationDate: '2fa8fc15-db16-4acb-9a4f-0cb0cd39dbbf',
  templateExpirationTime: '862665b3-63f5-437d-bade-1cc85df9518f',
  templateUseTime: '59fe847a-3829-4880-acd6-e58fbef946bf',
  templateRemovalTime: 'f3c76129-051d-4ad4-b172-5eb889b56fd6',
  templateAlertTime: 'b2c29816-9f3e-44ac-b659-337e0404665f',
  lotExpirationDate: '58b4954d-f26c-4809-b474-58c4dcdac6fb',
  lotUseDate: '8c13fcfa-1898-4647-9b97-0fcccea8bd41',
  lotRemovalDate: '62ef5d52-ef31-4c9f-aad6-c539b03dc983',
  lotAlertDate: '9e1da90b-5361-449f-bf5f-4cd40ef2a4c7',
  lotProductExpiryAlert: 'cd8e104b-23ee-4aea-aeb3-d1d689fe466f',
  lotProductExpiryReminded: '54af7796-4dcb-4b75-a0f4-16120540edfb',
  quantExpirationDate: '1f1e465b-5269-413f-92dc-c493e0f4c62c',
  quantRemovalDate: '6ac784cb-8dc6-4223-acbc-024e45f0f513',
  moveLineExpirationDate: '6331206a-48a0-4c14-a307-c03acc86a4e8',
  moveLineRemovalDate: 'b5742b2a-d477-407e-b53b-869b116fb129',
} as const;
export const PRODUCT_EXPIRY_SEED_KEY_FEFO = 'product_expiry.removal_fefo';
