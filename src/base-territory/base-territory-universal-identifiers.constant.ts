// Universal ids of the service area module. New ids are random UUID v4 and never change after release.

export const RES_REGION_OBJECT_UNIVERSAL_IDENTIFIER = '40b930d9-31d1-4707-8734-b2f278c57265';

export const RES_REGION_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '103c31d0-32f6-4c9d-b85e-d8681a6c9eea',
  description: '6320c55e-3488-46c1-bf56-09bcb813d7ec',
  partner: '4d5a9c6e-1dab-47a5-97cc-ed77f6d9f6a3',
  districts: 'e90b8828-3383-4b12-a8cf-3ce1d914189d',
  fsmLocations: '51877974-588c-4478-ab23-17dfd01a25ae',
  fsmEquipments: '0d1136cb-2fd7-4dc7-87fd-ef9820d71c4c',
  fsmOrders: 'abb0bb7d-145d-4e5a-8329-b5431b122930',
} as const;

export const RES_DISTRICT_OBJECT_UNIVERSAL_IDENTIFIER = '31e7a3c2-2d93-4ac6-9a43-e6f69ca9a364';

export const RES_DISTRICT_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'c3d555d4-8cd0-43be-b698-bd76397312ee',
  region: '417fda2c-8b22-43e6-8c03-6027fd56c5bb',
  partner: '4d7af638-d587-43c1-9323-efbbe0044455',
  description: '0cd7e167-29dd-4887-9285-0f4b74c71ea0',
  branches: '54a73fa7-3b22-4299-92f6-5820acea7657',
  fsmLocations: '295c1d18-cdbd-4e64-8f3d-c5a3f7cf7957',
  fsmEquipments: 'e4916031-6d5c-4399-8422-9a5924924c87',
  fsmOrders: '8a335a52-d6f7-4acf-8719-36b07aee589a',
} as const;

export const RES_BRANCH_OBJECT_UNIVERSAL_IDENTIFIER = 'c2e225ff-dc25-4418-8c9b-926e346740a0';

export const RES_BRANCH_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'a7cb0c02-0f77-42bb-942a-8994d6d9bb42',
  partner: '07a4c85d-be7e-400b-8655-e5204253a95c',
  district: '29cd34ae-a051-42a4-8e0d-0d28f454ef5f',
  description: '051cd423-8f48-42d5-adf4-04432e51cdb4',
  territories: '0bc21b66-410e-43e6-89ab-73ff37f1973f',
  fsmLocations: '0f0cc25c-fbb9-4e7a-9b37-123ecceaf1cd',
  fsmEquipments: '74a9c179-f48c-45ca-a376-b74c37cb1663',
  fsmOrders: 'fa5259dd-f909-45a9-a095-c4391ee9116f',
} as const;

export const RES_TERRITORY_OBJECT_UNIVERSAL_IDENTIFIER = 'bb835471-4575-4196-a56a-6d90e00028fa';

export const RES_TERRITORY_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'c05a253f-7c6f-4f12-ab72-bcb086b36cf9',
  branch: 'd09529d2-6702-4115-8730-acc181fe5e6a',
  description: '743e56a5-ea8c-4739-8329-a418cf59d047',
  zipCodes: '56ca7c20-c3d0-4ef2-a024-ee4cb4eed775',
  person: 'b7d2708d-a4d2-47c4-b8c2-f640621b4f1b',
  persons: '2df43d5d-8e1a-408b-9591-8f45427dd21b',
  fsmLocations: 'aceede50-5118-4165-957c-e83b60dae4b7',
  fsmEquipments: 'e1eac3b2-495d-4b8a-b95e-fae63df64b07',
  fsmOrders: '0a696e27-a184-4245-aae6-ad4e3c9ab8c8',
} as const;

export const BASE_TERRITORY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  personRegionsManaged: 'fa4d57e3-ef11-4229-b26e-29cb7a5fdacc',
  personDistrictsManaged: 'b18ab27d-5ee3-4317-bcdc-22470a6b1133',
  personBranchesManaged: '8aad8948-e1cf-4938-9dc9-343c4f067cb0',
} as const;

export const BASE_TERRITORY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  resRegion: '7485b361-3fed-4ef4-8d63-8cb714e67053',
  resDistrict: '24bc5d32-b752-44da-812b-71cfa4ca761d',
  resBranch: '1345d746-f1a5-4d9a-ae09-014e7ead8b61',
  resTerritory: 'b3a0158e-93bd-411c-8673-1a9c20a2a46a',
} as const;

export const BASE_TERRITORY_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS = {
  regions: '1116f6e0-3957-489a-bccf-ebe9083c757a',
  districts: 'b2083177-a3d1-4729-b005-d9eab0a00854',
  branches: '361d3307-d91e-4ad6-a8a3-669b1e638703',
  territories: '185c3d17-4605-4057-b30d-764fb7b3c12e',
} as const;
