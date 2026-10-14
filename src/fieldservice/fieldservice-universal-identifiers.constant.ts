// Universal ids of the field service module. New ids are random UUID v4 and never change after release.

export const FSM_ORDER_OBJECT_UNIVERSAL_IDENTIFIER = '9e9eebcd-b566-4968-8266-c92d379ba3cd';

export const FSM_ORDER_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '01dea077-f6bf-4098-955e-58a8eb65dadc',
  closedStatus: 'c928186a-4a11-42d5-93b1-4557ce8edc39',
  priority: 'b740007c-2c25-4fb5-ab11-41d8c2c5f9dd',
  team: '43511d7e-7e17-41b5-b1b7-c1ff63c19135',
  location: 'baebe6b8-ba4f-4afd-9136-bb323f25de6b',
  locationDirections: '59836b56-c02a-4974-9aba-93d6561c1972',
  requestEarly: '3afee399-1943-45c9-ac8d-df2f05a24d32',
  requestLate: '7a38e459-fbcb-49f3-b002-f4122699e4b7',
  signedBy: 'f819b88a-2851-4ad2-9c41-5c18df311c76',
  signedOn: '2bad976e-4a50-4045-b331-29d4a4387731',
  description: '77601ea4-6495-450d-8c14-80aeab405567',
  person: '6d71d8ce-10b4-4fe7-8e66-e553e5840ab9',
  persons: 'd6805fee-ef60-47fe-8171-eceafe24c9fa',
  scheduledDateStart: 'ae363998-dddd-4ee1-bd6e-0337a4a2b3e5',
  scheduledDuration: '2e0b1ebf-a334-490e-be86-a4850c529433',
  scheduledDateEnd: 'a6698ec3-f0e7-43f7-aee5-30bc76c6a582',
  sequence: 'a6944bd0-a592-4205-aefe-fc562f69e0f9',
  todo: 'bfd09ae0-718b-4145-a57c-e1005c9e85fa',
  resolution: '2807b6a1-6fc7-427d-9c2d-ab911bf0752d',
  dateStart: 'c7c5757e-2457-4e2d-ade5-4af436ae2da3',
  dateEnd: 'dccb70e3-10fb-4069-af65-65c75ae561b3',
  duration: '094150ff-ef15-4d59-b47c-3300fa7d42b0',
  territory: 'e406f1bc-4e74-4b5d-86a5-073cdb1184b8',
  branch: 'eb536a25-7020-4ffd-a108-009f8fa530e0',
  district: '33bbae27-01c6-4dac-aa49-a67fffd62ec6',
  region: '0226103f-4e9c-4523-bee1-883c07b72b40',
  template: 'fb9e89ad-9e67-42c4-8a84-4e75af4fafdc',
  equipments: 'e01c26e7-5dda-46e5-8035-1e8527385984',
  orderType: 'ee817f7c-278a-4967-ac48-d98c8aa00f10',
} as const;

export const FSM_LOCATION_OBJECT_UNIVERSAL_IDENTIFIER = '35a8d201-26ec-4f3f-98d1-67724293c9cf';

export const FSM_LOCATION_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'bda1c923-71d1-43c0-b5eb-2aee086d040c',
  ref: '77b2c241-4beb-4a6f-9c3f-6a7b5a5be853',
  address: '71b6b1eb-0f9e-45ab-98b0-47ea085be302',
  phone: '8d9f0afa-0aca-4c83-be6c-75f90a74dd43',
  email: 'e25dabae-0b2e-4fe3-83e7-98da74a26380',
  partnerPerson: '15766849-86a5-47eb-a475-c37fc0822beb',
  partnerCompany: '065ab388-efb6-4cbb-800d-0e7f00a7ded3',
  ownerPerson: '188d71aa-fae3-4897-ac43-e2c6524c08f4',
  ownerCompany: '8879cd9c-6d58-4b3b-9d95-331a0888cb58',
  contact: 'ee0b820f-d80b-473d-b5e6-085b7dbed487',
  direction: 'ade52cc0-8a43-41df-9fba-5f0bc5dd8eff',
  description: 'd0f415cc-e99a-43b4-94c8-4566e53a8cae',
  notes: '944b86f4-63f8-4562-ba14-a799dc00aa26',
  territory: '4547b26f-507d-4251-8767-1b9e22d0f951',
  branch: '4dd61a9e-dabc-4a3f-bbab-e5b87f362951',
  district: '0390aca7-569d-496c-b828-8c45cf78f344',
  region: '89e631a1-6d6f-4843-aefa-2d79779b87e7',
  calendar: '987804dd-a603-4c7f-b12c-da77970e0cf7',
  parent: '7f99a11c-8d9c-4ea7-b67b-f7d211080b76',
  children: '368b996d-95aa-4ac0-8ba7-f2162aa882bd',
  persons: '1a3634bd-326d-42b3-8cd9-e3c4e0fbf8b9',
  team: '45c3b7e6-9b36-4632-857d-e241f56e6aeb',
  equipmentCount: 'aafbd37e-6c69-4619-9b3c-179b5fc48a70',
  sublocationCount: '67735607-74d1-4f11-8c7c-ebf2d23835c5',
  completeName: '83ba566a-30b6-4fe8-a9be-675830d53a4e',
  completeDirection: '9bdb6aed-29bd-49f1-ae5d-07a4fb9e85a7',
  orders: '8819faa6-e1cb-4ee6-9223-a785dcf26014',
  equipments: '9f9d8b9d-51e7-496c-a151-5fddb701a8d7',
  currentEquipments: '7fffb69e-763b-48ed-90d3-07d40094f3ec',
} as const;

export const FSM_PERSON_OBJECT_UNIVERSAL_IDENTIFIER = '4dc1503e-ea75-4923-87aa-a6417d6d3fed';

export const FSM_PERSON_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '50298f8f-e890-468d-9829-2ad9d27611dd',
  partner: '606206a0-d8da-4f22-b7eb-5dd612aba475',
  calendar: 'c228a1f2-ca14-42e3-8e40-3ec24e5f7309',
  mobile: '144c2105-2d9a-4dda-8d32-30f6a5c4c916',
  territories: 'c03f2d59-3d3b-46de-b3b3-cb8673bec103',
  active: 'd3b50cdd-8f75-4026-9555-6c1fa4d10d17',
  team: 'afabb185-db58-4b3b-bec3-736e59331e0a',
  locations: 'a58bba40-0ef2-446f-a1cf-a0d2a5660c94',
  orders: 'e23f8f28-875b-4e67-84ff-69b0cc2a1341',
  orderLinks: 'ae2bd05c-3946-48b0-b568-3c91f5443a8d',
  equipments: '6e521f89-70e5-4365-a2bf-138a58e97951',
  primaryTerritories: '0a8fd5c5-cddc-47a6-bbb3-2698a5b32128',
} as const;

export const FSM_LOCATION_PERSON_OBJECT_UNIVERSAL_IDENTIFIER = '90c6d97f-dca8-4e8f-a278-124dabcaba2d';

export const FSM_LOCATION_PERSON_FIELD_UNIVERSAL_IDENTIFIERS = {
  location: 'a913e404-9daf-45f3-9e39-566f1bbaa974',
  person: '1d7b7178-fcf9-4322-b9e1-07f22d626bb1',
  sequence: '14fdd2d8-9b8d-4634-98e3-02de945ec154',
} as const;

export const FSM_LOCATION_PERSON_INDEX_UNIVERSAL_IDENTIFIER = 'fdb67919-79e2-429f-a368-86d569f65a2d';
export const FSM_LOCATION_PERSON_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = 'd48d6a59-e20d-4059-b4fe-1f0be5473ebf';
export const FSM_LOCATION_PERSON_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = 'aeef0a0b-3a44-4e11-abec-28f59fae6409';

export const FSM_EQUIPMENT_OBJECT_UNIVERSAL_IDENTIFIER = '0ed4e552-8b01-4941-8f37-cb4a24b33642';

export const FSM_EQUIPMENT_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'b9f45d8c-1e88-420b-88b9-3fe7c18902dc',
  person: '4fd37af1-ee56-441c-a828-13456ef126e7',
  location: 'b58c1ed3-79ad-429b-b7dc-11bbc9755da7',
  currentLocation: 'ee09d4e1-4c57-4840-b0ff-23c3812809a5',
  notes: 'b5617fa6-7fbb-4fc3-929d-6698a9863b19',
  territory: 'babb4659-4112-4d38-9c15-7f3516804fe2',
  branch: 'd87a88df-1d01-4c1e-8fb0-9bfe25b7bdd0',
  district: '8699b606-b397-4799-a001-156d4854f451',
  region: '9a8c7d8c-15e2-4f4b-95cf-6bd944ffda21',
  managedByPerson: '410691f2-1f42-4fe9-8cbd-469b7c9142b8',
  managedByCompany: '15bacc06-6d15-4c55-a40c-402290a7a98b',
  ownedByPerson: '873615c2-4d4d-47fb-b4e0-66ae73e8c0df',
  ownedByCompany: 'a0854ecf-b0f0-42e4-9d77-df14c02cd0a3',
  parent: 'b51cbdb0-6e34-4b65-a196-65eec8d7dc55',
  children: '4b55c7fe-f7a2-4a14-9261-043473c2a481',
  serial: 'f3148165-e503-49f4-932d-8eb10e800b49',
  warrantyStartDate: '0ed43f4d-1e27-4778-9341-6b14fb507a02',
  warrantyEndDate: 'd558bbd6-7fc3-4fe7-8e32-3e3618ced8df',
  productWarranty: '0c9586fc-744d-431c-97f9-2b6c983a0ab9',
  productWarrantyType: 'cfcb1984-50a9-42ee-bf40-8d0999e31dc3',
  orders: 'f3f4bafa-3f80-4deb-9540-6f259609739c',
} as const;

export const FSM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER = '788b5d1b-8262-4fbb-876d-a8ddfa312d72';

export const FSM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '465b3b8d-cdda-4f2c-885e-e14a5d45012c',
  description: '29e254ff-dd9d-4b3f-acde-ec276e116de9',
  active: '2a1892cb-54d9-4678-8faf-a3453044bfe7',
  sequence: '323289e8-65a4-455e-86d3-6be5743cc7e7',
  orderCount: '841ecdf3-63ea-4eae-915f-aa5e202656b9',
  orderNeedAssignCount: '0691a2b5-0609-47a4-b15a-fecf46a91695',
  orderNeedScheduleCount: 'dc769332-301e-475f-8e5b-cbee39083e8f',
  seedKey: 'd544ad65-b737-4e32-88dc-67fb4d05c9d8',
  orders: '60061ef9-16a9-445f-bda0-f2b72e5e513f',
  locations: '0c28ed7e-8046-47ea-a364-5137b8c15aee',
  persons: '2f3b39e8-1f29-4860-ae57-484a150a32dd',
  templates: 'b0718204-947d-45fb-abbf-2c9a943f4eba',
} as const;

export const FSM_ORDER_TYPE_OBJECT_UNIVERSAL_IDENTIFIER = '954538a2-1e7c-40f8-beed-a7f46e4568d3';

export const FSM_ORDER_TYPE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '202c9131-9e52-465b-9838-57ebff52d817',
  internalType: 'dc5c28db-59e6-4779-9a60-865a958cbe6e',
  orders: 'c4f2a5c7-adfc-4e55-b4d3-2dd0748d79b0',
  templates: '43125b2c-b569-4c52-9ab1-277db8b01e3e',
} as const;

export const FSM_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER = 'd654355a-e66c-4917-920f-44a083170d20';

export const FSM_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'dcc5d244-5252-45fe-8b7c-ec41394b1396',
  instructions: '113b99da-5173-4c2e-b528-10dc85479b6a',
  duration: '2e4e901d-654f-4fd1-b82d-d5de8c414797',
  orderType: '23d5cd2b-9500-40f2-92a1-7a5b7932251a',
  team: '0e258a2b-0f50-4b29-b5c2-92ffb55114aa',
  orders: 'b7bf3d67-2166-4a07-82d4-7dda82a2fefd',
} as const;

export const FSM_EQUIPMENT_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER = '1f8ceef6-2023-4604-b68c-97008caea391';

export const FSM_EQUIPMENT_FSM_ORDER_REL_FIELD_UNIVERSAL_IDENTIFIERS = {
  equipment: '7a2b1802-3b44-47e7-ab14-78a73a083f36',
  order: '9ba38f41-9487-4116-ba50-42ff12328178',
} as const;

export const FSM_EQUIPMENT_FSM_ORDER_REL_INDEX_UNIVERSAL_IDENTIFIER = '6c2f9c4e-9ac9-49cf-8097-50cb5194ed53';
export const FSM_EQUIPMENT_FSM_ORDER_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = '28e69779-e772-4881-922e-444abc27789f';
export const FSM_EQUIPMENT_FSM_ORDER_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = '25c63a37-e537-4a2d-a362-7e943e8c20f2';

export const FSM_ORDER_FSM_PERSON_REL_OBJECT_UNIVERSAL_IDENTIFIER = 'efab723f-af80-4075-8c60-e679fa43238d';

export const FSM_ORDER_FSM_PERSON_REL_FIELD_UNIVERSAL_IDENTIFIERS = {
  order: 'c6682f6f-2062-4fdd-aaa9-6a1372de628d',
  person: '10895fa7-a2b4-4f82-b7a4-eb06cc84cd0d',
} as const;

export const FSM_ORDER_FSM_PERSON_REL_INDEX_UNIVERSAL_IDENTIFIER = 'fde9783e-2321-4863-8a10-e391263a47b3';
export const FSM_ORDER_FSM_PERSON_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = 'c2bc7281-ea2f-4930-9096-20e103a842bd';
export const FSM_ORDER_FSM_PERSON_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = 'd792fa8d-9b61-4c26-a451-d87058840370';

export const FSM_PERSON_RES_TERRITORY_REL_OBJECT_UNIVERSAL_IDENTIFIER = 'a46ef0bc-bb8a-4c23-acfd-c79c462c7da4';

export const FSM_PERSON_RES_TERRITORY_REL_FIELD_UNIVERSAL_IDENTIFIERS = {
  person: 'c667c8ca-bea6-4d45-81ff-b739f353473a',
  territory: '76dd552b-58b9-46e1-a94f-96e272348490',
} as const;

export const FSM_PERSON_RES_TERRITORY_REL_INDEX_UNIVERSAL_IDENTIFIER = '72a24144-2b71-4882-961c-8eafdabc90f0';
export const FSM_PERSON_RES_TERRITORY_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = '3c3f52fd-5ed2-402f-ba1c-9f86d2637bcd';
export const FSM_PERSON_RES_TERRITORY_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = '76fc61a4-f507-488b-a0c2-49cb9407303d';

export const FIELDSERVICE_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  personOwnedFsmLocations: '13887ab8-eb09-49a2-9d34-3e083d06efbb',
  personContactFsmLocations: '57fee539-35e3-4367-ad50-436d9fa29937',
  personPartnerFsmLocations: 'f6eea7a3-3852-4a9a-a3ab-d4e3c8fe11c4',
  personFsmPersons: '83db4bb0-d477-4d72-81e8-d3ca01dc3071',
  personOwnedFsmEquipments: 'c402f58c-6d1f-4f54-88d6-a5b2ebb0905f',
  personManagedFsmEquipments: '2dc741ed-4934-4fed-a4a6-d9d1ecbc0cf8',
  companyOwnedFsmLocations: '58c5f4a5-73da-435a-828d-34a66101e73e',
  companyPartnerFsmLocations: 'd3294750-0f54-4079-a3c2-7ef5d7da181c',
  companyOwnedFsmEquipments: '90be449f-a5bd-4e51-969f-0bca1b3a69b7',
  companyManagedFsmEquipments: '4ae12615-c595-4813-8f41-771cab46c355',
  resourceCalendarFsmLocations: '9f774513-117d-4919-85cc-7e5155e969ce',
  resourceCalendarFsmPersons: '06d554cc-ed30-4ede-80fa-67b558fa20ec',
} as const;

export const FIELDSERVICE_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  fsmOrder: 'f1967814-1436-43c5-ae26-cebe5213c36b',
  fsmLocation: '7d7424f4-d66c-4708-8862-161f15c387c9',
  fsmEquipment: '9c4f13f0-28ce-42e3-9c63-f62d6bffa2b6',
  fsmPerson: '93514ff9-fed0-4457-b316-d1e6f38ff593',
  fsmTeam: '022de4af-d28b-4a6d-b36d-6a208b4436b6',
  fsmOrderType: '67ae9897-7799-43b0-8628-169eb8e10562',
  fsmTemplate: '75348360-d2cd-48ef-b3a1-f27672f317f1',
  fsmLocationPerson: 'c71dd587-9ca8-4411-b20c-336b58c084b7',
  fsmEquipmentFsmOrderRel: '571e6622-6960-4c74-bacd-03315df733be',
  fsmOrderFsmPersonRel: '1583bfff-f3ae-496e-95c5-2e4142d55f78',
  fsmPersonResTerritoryRel: 'ad409a73-8518-4589-abbf-42b0207af358',
  person: '53f85840-b72e-448c-a9f9-57cc1fb56cc1',
  company: '91f1ba31-86da-4c28-8207-f243b5eb776a',
} as const;

export const FIELDSERVICE_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS = {
  folder: 'f7933d8d-a62b-4c4a-a62e-19555eb05cc3',
  orders: 'd98a0530-2140-4eae-ac56-6a663de7a1e7',
  ordersBoard: '0a812a7f-a512-4046-9758-0a447c6c8c9d',
  locations: 'da965bb5-05a9-4947-92d6-d64f765e92d9',
  equipments: '0f6ff009-dc28-40d5-9240-aaf9e302f6cb',
  persons: '2bba7c72-e2e3-499a-a55b-7baf37877a6c',
  teams: '91a364c1-b100-430c-8f91-5ac37f65b917',
  orderTypes: 'fd03c0df-2317-4610-b87c-787840cc2b1c',
  templates: 'b1d39fa6-2707-4c64-884e-4f57a343f829',
} as const;

export const FIELDSERVICE_VARIABLE_UNIVERSAL_IDENTIFIERS = {
  requestLateLowest: 'f7ee412f-98db-4683-9554-c6e0cbafb824',
  requestLateLow: '9c742f55-f3b3-4ce8-a5cd-6ec73d801ecb',
  requestLateMedium: '042bf02c-8d8d-4541-b5eb-4d47785da4f2',
  requestLateHigh: '33bafdfc-5ab6-4762-bba6-edd119fb9f54',
  autoPopulateEquipmentsOnOrder: 'f8dd4a2f-10e1-4b20-9c7c-35b352134a7e',
} as const;

export const FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS = {
  completeLogicFunction: '82d80898-82f8-4a51-b826-30ddb16622cc',
  completeFrontComponent: 'd7e62b8e-0ca4-4b6d-8538-6f8e825754a9',
  completeCommandMenuItem: '45c93d69-d423-4b50-8d3b-b82831cbf7d7',
  cancelLogicFunction: '9ce4f904-3865-4998-ba56-fcda99105c1f',
  cancelFrontComponent: '94b22799-9bad-4333-aaee-18e5dcffb723',
  cancelCommandMenuItem: '1d1bc29d-69d5-4d80-8e82-0c68a31cceee',
  signLogicFunction: '8823b21d-9b13-4039-9b3b-55c8be0f6b00',
  signFrontComponent: '4302bf53-34d8-45fa-b5b7-dbd38ed93a49',
  signCommandMenuItem: '8bf60cc7-561d-401a-9c77-a0934e46b57d',
  personToLocationCommandMenuItem: '07afe06c-56b0-449e-8e1d-c0fa7d925379',
  companyToLocationCommandMenuItem: 'a7d01eb4-a0e4-4cb0-9af8-3817e668035c',
  makeLocationLogicFunction: '7c810ac5-6944-4a6c-91b8-b8b2ca78f267',
  makeLocationFrontComponent: 'e0f86973-309f-41fe-9c3b-a8e1a0d15f62',
  makeWorkerLogicFunction: '788eb0cb-522d-4789-8f9c-c77594c63f88',
  makeWorkerFrontComponent: '2651e140-0a84-46d5-b596-1d84d6503fc5',
  makeWorkerCommandMenuItem: 'd5d6ae8a-adac-424d-b628-34d5938b55ad',
} as const;

export const COMPLETE_ORDER_ROUTE_PATH = '/fieldservice/order/complete';
export const CANCEL_ORDER_ROUTE_PATH = '/fieldservice/order/cancel';
export const SIGN_ORDER_ROUTE_PATH = '/fieldservice/order/sign';
export const MAKE_LOCATION_ROUTE_PATH = '/fieldservice/partner/make-location';
export const MAKE_WORKER_ROUTE_PATH = '/fieldservice/partner/make-worker';
