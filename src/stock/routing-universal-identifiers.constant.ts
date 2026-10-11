export const PRODUCT_REMOVAL_OBJECT_UNIVERSAL_IDENTIFIER = '1aa79eea-cb1f-4b88-a480-862b2bca0204';
export const PRODUCT_REMOVAL_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '87673528-bdfe-4424-9452-1fb2e274f758',
  method: '805bba44-b86d-4ad3-b1b3-d7fe09531aa0',
  seedKey: '6b19465b-6232-4d20-bead-7a55e7cb11a2',
  locations: 'cd1fefcb-155a-4903-835e-e96b8301ea2d',
  categories: '9555d5ee-ac90-4e02-82f7-1445e601f00e',
} as const;

export const STOCK_STORAGE_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER = 'f84cddea-8270-4b8f-967e-2dc352894dff';
export const STOCK_STORAGE_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'ea29f510-bcc6-4bef-9778-8d6f2e623509',
  maxWeight: 'ad90d93e-0da3-45c4-8144-78498ffa9dd4',
  capacities: 'da4e3d64-d33b-4bc6-bf44-dd0bf8c398fe',
  allowNewProduct: 'e14e9f38-c2e8-459d-b6d7-845f211909a6',
  locations: 'da31d543-8623-4230-b3ce-3b0117121fc8',
  putawayRules: '6fed5973-fc7a-4e7d-b017-5443fb71b551',
} as const;

export const STOCK_STORAGE_CATEGORY_CAPACITY_OBJECT_UNIVERSAL_IDENTIFIER = '2bea0646-3279-4e56-8799-f00f36a56789';
export const STOCK_STORAGE_CATEGORY_CAPACITY_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'd2541c38-6d01-4672-b187-6c72bd7c9e17',
  storageCategory: 'b3dd8355-c841-4516-8964-756bec8a9308',
  product: '5c7503b8-a52d-46df-9aeb-017d69d9509c',
  packageType: '4c769f95-7432-4381-a49a-982c4df1e2a5',
  quantity: 'eaf922c9-3ac0-4e77-a4ad-f685621b924f',
} as const;
export const STOCK_STORAGE_CATEGORY_CAPACITY_PRODUCT_INDEX_UNIVERSAL_IDENTIFIER = 'dbe68e4f-1551-43bb-9b52-b5e378cf6571';
export const STOCK_STORAGE_CATEGORY_CAPACITY_PRODUCT_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = {
  product: '7b0f59f9-850d-4520-acfb-49119b88a0bf',
  storageCategory: '7ff89616-37f1-4042-bc75-1a4f9458494f',
} as const;
export const STOCK_STORAGE_CATEGORY_CAPACITY_PACKAGE_TYPE_INDEX_UNIVERSAL_IDENTIFIER = '0ab26f47-504b-4c73-924a-6ce5fed07daa';
export const STOCK_STORAGE_CATEGORY_CAPACITY_PACKAGE_TYPE_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = {
  packageType: '357198db-9545-4095-9753-4326ef994453',
  storageCategory: '61aec928-e893-45ef-8c3b-7da5b42a828e',
} as const;

export const STOCK_PACKAGE_TYPE_OBJECT_UNIVERSAL_IDENTIFIER = '07104cb0-0131-444b-a7b3-70988c864668';
export const STOCK_PACKAGE_TYPE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '057d6706-fa3c-4e32-98fb-0a0c160a527e',
  sequence: '28817e2e-095f-4de8-9c99-aa818e757f4a',
  referenceSequence: 'f8e451a6-ae01-435a-a7c4-91fb6897061e',
  sequenceCode: '7419b8c2-363f-4fab-881b-713ea66b8dec',
  height: '5e83b4f8-e5f5-44f1-91a8-c7f836689565',
  width: '76c40864-8a0c-40b6-97ef-40b718ba1a8a',
  packagingLength: 'a5862ae2-8761-47c7-955a-f86b2f30fc9a',
  baseWeight: 'e1dfe075-e50e-4a8d-96e6-94dc0fe82013',
  maxWeight: '4cea88f0-69cf-439f-9105-97088196b810',
  barcode: 'b5dc6f4c-eb5f-449c-a227-c956f328db5d',
  packageUse: '2d156415-5527-4906-8382-eae30c4afb79',
  routes: '865c4719-c567-453d-afd7-22afbf5006db',
  printouts: '2033e3e5-c3bc-4f15-bb1b-108b38b8ef19',
  uoms: '6ec3a8ca-6609-46aa-8caf-bd367a99b394',
  storageCategoryCapacities: '5bcbec34-4b65-4419-ac28-5ed75c3e50e3',
  putawayRules: '98f943dd-d90d-480f-a32e-c39be0c02535',
} as const;
export const STOCK_PACKAGE_TYPE_BARCODE_INDEX_UNIVERSAL_IDENTIFIER = '4668a930-4baa-4ae0-ae19-0104f56e77b7';
export const STOCK_PACKAGE_TYPE_BARCODE_INDEX_FIELD_UNIVERSAL_IDENTIFIER = 'c6893dc5-d9cd-4c75-9f89-96339034762f';

export const STOCK_ROUTE_OBJECT_UNIVERSAL_IDENTIFIER = '5014f207-2af8-4121-a1bb-2cb0168c316a';
export const STOCK_ROUTE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '1635e4d6-4c10-462c-80f7-65e42ef625ff',
  active: '8ee89d2e-87de-4424-88fb-5a9a6153ec7b',
  sequence: '55c2328a-62fc-4142-97ab-3f86b50ac1f8',
  rules: 'a871171f-e857-4515-8e60-56207c639083',
  productSelectable: 'b56e9be6-1130-49eb-b332-9b73b45bdfc5',
  productCategSelectable: '9216c05a-ba0c-4564-b27b-1aced1a3b9a0',
  warehouseSelectable: '103f47e5-5f38-4df8-a7cf-753884c93889',
  packageTypeSelectable: '227a1ce3-f6aa-4011-88c5-a23388ce9e89',
  suppliedWh: '3f5a8461-3281-4888-ad36-9b039dbe24c0',
  supplierWh: 'f4556a39-2d83-4a7b-a949-4ee568a64752',
  products: 'c952ca27-8221-47c7-847c-deed0280a54f',
  categs: 'b2438565-e8e5-4a77-af77-717dfea80247',
  warehouses: '83c11fd4-505d-4f08-88b8-8fb78aed7090',
  packageTypes: 'a8c6463f-8a3b-4005-b8e8-85094c0f2124',
  seedKey: 'db8bbfac-4fcf-4680-aa86-756a3127a744',
  warehousesReception: '750d3d25-5d90-4463-a916-7b8530fafd69',
  warehousesDelivery: 'c63a71d2-e56a-4b12-bfd2-9b7211372e83',
  moves: '5f950f6f-2a06-4b45-9a6f-089efd13cbdf',
  categoryTotals: 'd7bb5f67-eb0b-4d48-975f-cf0ca2f74219',
} as const;

export const STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER = '80c93fc4-340e-4df2-98e6-fdcc20ea5c2b';
export const STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'c0dd03b4-cfcf-4d42-b091-cfe84afe632d',
  active: '1cfba307-1767-4d74-84c0-6b486b3cb628',
  action: '6e2682da-96e4-455b-8e0a-0e0685d75fc9',
  sequence: '347d9042-3cfb-43c8-aea6-3462355449ae',
  locationDest: '3c3b7da4-dc02-48b9-a73f-cd5696c5c384',
  locationSrc: '02e0b95e-8691-4908-ade3-9606f827b6d0',
  locationDestFromRule: '1fd62cfe-09e0-44e6-bdb2-c8ad5723980b',
  route: '5c1e5a94-360f-4fb3-bb09-b1c42391cb56',
  routeSequence: '9d0bb9e7-83e4-4c0a-aeea-1032787b48cd',
  procureMethod: 'bc41857e-6198-4156-8187-65af7aee888c',
  pickingType: '26cb49fb-41ce-46e7-b52e-402ee8cde2d4',
  delay: 'c4fdf804-7e19-419e-9913-6d1cb972992c',
  partnerAddress: '99b26a06-9f9e-4c74-a691-9ab79e275251',
  partnerAddressPerson: '0cee05ff-f079-4a53-b165-d1e065f8bfcd',
  propagateCancel: '9f27fa86-3ec8-4bbe-82e8-1ba7fbb23f4c',
  propagateCarrier: 'fa7506ca-ee7c-4db4-be00-774f0396e20a',
  warehouse: 'ecb0ede9-5cca-4f0b-828c-3ba98520793d',
  auto: '5360dbe2-1d9e-44d3-97a0-c8bf8d28a829',
  pushDomain: 'faced81e-dbd8-4060-a60f-40a5fd15112b',
  ruleMessage: 'af3d0d27-dadd-40c9-bc72-dd110dd81d98',
  moves: 'eb2a5500-0011-4c73-bf46-7f4ec9344d9e',
  warehousesMto: 'fa49514c-431b-4767-a2bf-ec53b455abc9',
} as const;
export const STOCK_RULE_DESTINATION_ACTION_INDEX_UNIVERSAL_IDENTIFIER = '4811bb7c-82ea-4d24-a22a-fba1ea40c1ca';
export const STOCK_RULE_DESTINATION_ACTION_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = {
  locationDest: '3df2ce26-39bf-43d2-a716-34fd9aa0ef6e',
  action: 'beaf282b-baaf-4dce-b257-e08eda93270c',
} as const;
export const STOCK_RULE_SOURCE_INDEX_UNIVERSAL_IDENTIFIER = 'a6eebe57-b146-4fc2-b658-4edc79ce9c8b';
export const STOCK_RULE_SOURCE_INDEX_FIELD_UNIVERSAL_IDENTIFIER = 'a30fc83a-7121-420e-8402-46345d2e39a3';
export const STOCK_RULE_ROUTE_INDEX_UNIVERSAL_IDENTIFIER = 'd29d490e-bb71-4123-9980-19ed362f4416';
export const STOCK_RULE_ROUTE_INDEX_FIELD_UNIVERSAL_IDENTIFIER = '8365070e-05e1-414e-83da-c4d2c362aa17';
export const STOCK_RULE_WAREHOUSE_INDEX_UNIVERSAL_IDENTIFIER = '5907754f-599e-4a28-8e76-a24cd94383c8';
export const STOCK_RULE_WAREHOUSE_INDEX_FIELD_UNIVERSAL_IDENTIFIER = 'e013a161-c220-4616-b264-1f02f394c134';

export const STOCK_PUTAWAY_RULE_OBJECT_UNIVERSAL_IDENTIFIER = '7ffab208-afe5-4ddf-840a-23428df95116';
export const STOCK_PUTAWAY_RULE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '0dace140-5724-4afc-b996-aa2a2f991a9c',
  product: 'ddcb6862-2976-4a8f-a579-1c84c5300c17',
  category: 'd239aad0-baa0-4786-b955-01e4ec76acfb',
  locationIn: '2df19648-b054-4065-8c7d-873cedb5de04',
  locationOut: 'b31b66cf-4a11-4264-b7bc-c325cd087e08',
  sequence: '8fa3413c-5551-43c9-a751-38b21b45cbde',
  packageTypes: '9a13e24f-39eb-4ea0-95bb-4302a1f288f8',
  storageCategory: 'd275d9b8-723f-44c3-b2e0-0041721c0165',
  active: '4e3923ae-7a39-4b04-873b-7b1a9ea372d9',
  sublocation: 'cfeb601a-036e-4ebc-b946-153de678f514',
} as const;

// Link objects: the object, its fields, the unique index on its two relations and one id per indexed field.
export const STOCK_ROUTE_PRODUCT_OBJECT_UNIVERSAL_IDENTIFIER = 'fdd52edd-0edf-4727-b35f-c7f87bc8461a';
export const STOCK_ROUTE_PRODUCT_FIELD_UNIVERSAL_IDENTIFIERS = { productTemplate: '949e3ce9-4ef9-4d9b-a1ac-c0f8d8aa6180', stockRoute: 'd73ef24f-877e-4778-b663-5539d17553e6' } as const;
export const STOCK_ROUTE_PRODUCT_PAIR_INDEX_UNIVERSAL_IDENTIFIER = 'ca711fce-db59-4a72-92b0-05ce922005bb';
export const STOCK_ROUTE_PRODUCT_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = { productTemplate: '56520194-aff8-4dc1-aa3d-9f27ab5777e3', stockRoute: 'db95851c-238c-40e7-a3b0-c1fee14a1f9e' } as const;
export const STOCK_ROUTE_CATEG_OBJECT_UNIVERSAL_IDENTIFIER = '4ee0df75-29b9-4f45-b27c-a2294a7d2604';
export const STOCK_ROUTE_CATEG_FIELD_UNIVERSAL_IDENTIFIERS = { productCategory: '3b53fd4d-b46a-482d-93df-363bab892fad', stockRoute: '8eabf86e-948f-4c8c-bc3c-9ef5b5e30df6' } as const;
export const STOCK_ROUTE_CATEG_PAIR_INDEX_UNIVERSAL_IDENTIFIER = '48aa7039-ebe9-4600-b559-abae0de97368';
export const STOCK_ROUTE_CATEG_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = { productCategory: '2dc09938-412b-4089-80e8-92fc8861d6a4', stockRoute: 'ff0562da-391c-4441-ab62-9654e684d719' } as const;
export const STOCK_ROUTE_WAREHOUSE_OBJECT_UNIVERSAL_IDENTIFIER = 'afd139e8-02fe-44a3-b72e-8d8e60071c1c';
export const STOCK_ROUTE_WAREHOUSE_FIELD_UNIVERSAL_IDENTIFIERS = { stockWarehouse: 'c4683ebe-8538-41ff-a86e-e722d906bbe6', stockRoute: '931d61fc-5eaa-4fa4-9b3b-fd60e1400a04' } as const;
export const STOCK_ROUTE_WAREHOUSE_PAIR_INDEX_UNIVERSAL_IDENTIFIER = '5edc1394-7513-4691-a589-8e9a13b4dd93';
export const STOCK_ROUTE_WAREHOUSE_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = { stockWarehouse: 'd0f971c7-e9c7-4d9e-b2e5-8abeeadb9822', stockRoute: '72c8743d-27b1-4467-bd66-fd682a392644' } as const;
export const STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_OBJECT_UNIVERSAL_IDENTIFIER = 'c278ba3c-025f-42b9-a71c-977110da09ea';
export const STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_FIELD_UNIVERSAL_IDENTIFIERS = { stockPackageType: '7a91065c-4b38-4cc2-96cf-aba957d91d54', stockRoute: '03e61978-5243-42fa-91b5-311ab0ff1128' } as const;
export const STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER = 'ba1c9968-94fa-45c7-afae-a47bb895c297';
export const STOCK_PACKAGE_TYPE_STOCK_ROUTE_REL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = { stockPackageType: '82da8b21-6327-4b23-9b54-930506960e7f', stockRoute: '9f79c878-6f9a-42f4-9fee-05cea836bbd0' } as const;
export const STOCK_ROUTE_MOVE_OBJECT_UNIVERSAL_IDENTIFIER = '5984d78d-d995-4829-81c4-a949cd40d055';
export const STOCK_ROUTE_MOVE_FIELD_UNIVERSAL_IDENTIFIERS = { stockMove: 'e5b84b3a-0f68-4674-a9ef-9525ff7c68da', stockRoute: 'a61469e8-818e-4902-b0b9-b7561fe79522' } as const;
export const STOCK_ROUTE_MOVE_PAIR_INDEX_UNIVERSAL_IDENTIFIER = '4a1bacea-dc5d-4569-8e3d-edcb4ec5e0ce';
export const STOCK_ROUTE_MOVE_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = { stockMove: '4b573300-542c-454a-b598-3d43ad285645', stockRoute: 'b847e775-9964-43f2-8572-f5aa73436275' } as const;
export const STOCK_WH_RESUPPLY_TABLE_OBJECT_UNIVERSAL_IDENTIFIER = 'd3533caf-5c82-427c-9dc6-7a0c73c00920';
export const STOCK_WH_RESUPPLY_TABLE_FIELD_UNIVERSAL_IDENTIFIERS = { suppliedWh: '5b89cb34-38af-4023-ac27-183ba578adec', supplierWh: '27715b78-8c82-4d23-8a38-c11dcd044640' } as const;
export const STOCK_WH_RESUPPLY_TABLE_PAIR_INDEX_UNIVERSAL_IDENTIFIER = 'caf12daf-6eb6-4595-b5ff-aee488783450';
export const STOCK_WH_RESUPPLY_TABLE_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = { suppliedWh: 'fc398600-d40a-45a6-9370-94c1722ac5a2', supplierWh: '2675d59a-f067-4f5d-960e-d85f61a8e170' } as const;
export const STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_OBJECT_UNIVERSAL_IDENTIFIER = 'f1edfeec-ddbc-4074-a6d1-76febafc3622';
export const STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_FIELD_UNIVERSAL_IDENTIFIERS = { stockPutawayRule: '8c261ea7-8962-4347-8574-8ea1bf1daba6', stockPackageType: 'fab3bffc-22bb-4de8-b2a1-d215d5da9b98' } as const;
export const STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER = '9711ead1-d497-4df7-92c2-7a1a0b248f1b';
export const STOCK_PACKAGE_TYPE_STOCK_PUTAWAY_RULE_REL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = { stockPutawayRule: 'd96557ec-a216-4a96-ade8-d472c902c8ee', stockPackageType: '0d1d69c7-52c1-459b-9eec-dfca61bf94d2' } as const;
export const STOCK_ROUTE_CATEG_TOTAL_OBJECT_UNIVERSAL_IDENTIFIER = '0894080c-6128-4186-ba02-8e4e0b1b01fe';
export const STOCK_ROUTE_CATEG_TOTAL_FIELD_UNIVERSAL_IDENTIFIERS = { productCategory: '01ed8d2c-e55c-46da-ad90-d7deb641b7ba', stockRoute: '76ff14b9-2f88-4715-835c-0b3771f6046f', inherited: '0168dde9-2783-44f8-80e9-d0111cc77959' } as const;
export const STOCK_ROUTE_CATEG_TOTAL_PAIR_INDEX_UNIVERSAL_IDENTIFIER = '1263c640-dade-48df-9915-c21564bf1a10';
export const STOCK_ROUTE_CATEG_TOTAL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = { productCategory: '390fc1b4-43ff-4db7-8ac2-2976e67188dd', stockRoute: 'da5adf95-01c3-4388-b2a2-371251a43415' } as const;

// Fields routing adds to objects other modules own.
export const ROUTING_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  productTemplateRoutes: '2e4a2e17-2ebe-43f5-bfe8-746acf058e69',
  productCategoryRoutes: '45e3478c-9348-4e6e-a36a-1aae7bbc88ee',
  productCategoryRemovalStrategy: '5bf0127c-f47c-459e-9273-8def716df5a5',
  productCategoryTotalRoutes: '764b39da-aaf7-484a-be37-abf1a3126807',
  productCategoryPutawayRules: '55227409-1c25-4f79-9467-a6c2e88883ad',
  productProductPutawayRules: 'dd98faaa-ad17-4d6a-9bb3-b5d7874ec90b',
  productProductStorageCapacities: '5aeaa94f-a8e0-487a-887b-a9f12d203ee2',
  stockLocationRemovalStrategy: '71301b1c-a56a-4614-9ff5-a49f35b95a10',
  stockLocationStorageCategory: '77463a42-47f0-44db-81a9-518816a90e99',
  stockLocationPutawayRules: '865e3220-6cb4-4a97-8eda-001b7f9e501e',
  stockLocationPutawayRulesOut: '24c1f100-c37c-4cc2-8660-672b528e2c55',
  stockLocationRulesDest: '82f1e912-6111-4aec-98b3-aaabcfa56e57',
  stockLocationRulesSrc: 'd8c59bb8-674d-44c7-9f8f-a2386cdd4197',
  stockWarehouseRoutes: '36176331-598e-4df5-8ea7-def3f2bce1a6',
  stockWarehouseReceptionRoute: '5bfa012a-043d-47bf-b530-44c7e7196ffa',
  stockWarehouseDeliveryRoute: '092b319b-1eb1-46a1-a527-17df0794dfcc',
  stockWarehouseMtoPull: 'f7e7ffb5-4ff7-4084-9c04-a30bff259d60',
  stockWarehouseResupplyWhs: '8291767a-6a8d-4432-9dcf-0726d737207c',
  stockWarehouseResuppliedWhs: '74d65c97-f5b3-47bb-8035-ce3e99080ab9',
  stockWarehouseResupplyRoutes: '5df0be9e-cbac-4d82-b7c4-75a02b467600',
  stockWarehouseSupplierRoutes: '9c3f0e7a-fa7c-4fa8-9b5e-72373bc7549d',
  stockWarehouseRules: 'cb6f910b-09a2-43fa-bced-025130a6bb2b',
  stockPickingTypeRules: '0b26462d-39f8-441d-9cc2-91f077bf7bb2',
  stockMoveRoutes: '3b86f76a-a059-40b5-98af-bf91b60ad3c1',
  stockMoveRule: 'ee23176a-a688-4dc0-a7b7-87b1affeca24',
  stockMoveProcurementRun: '2c3c107a-6722-40d2-8c9d-3c737f6f3613',
  uomUomPackageType: 'b0242dda-7073-47f5-ad39-2e0c2dba2497',
  irSequencePackageTypes: '2bbbcb77-852f-4b60-b4cc-affcf6f72003',
  companyPartnerAddressRules: '8b134a27-4347-41b5-aa13-9876a7b0be4d',
  personPartnerAddressRules: '68997ee0-cc82-4869-999f-fbcec58e9a15',
} as const;

export const ROUTING_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  productRemoval: '18fe6be4-20b3-4e07-850a-96ae5e7e7934',
  stockStorageCategory: '2fc6194d-7c5f-41ed-a4f6-673e7c50405c',
  stockStorageCategoryCapacity: 'f3403916-127b-4678-9c57-eb3b07195be6',
  stockPackageType: '7acc5283-43f4-457c-92b0-bc49dd598fa3',
  stockRoute: 'e8dcf011-bdb0-45d4-adec-15b5715fdb9f',
  stockRule: '545d6011-493a-4669-8d56-76db1b00ad3f',
  stockPutawayRule: '70cfb156-8000-4375-9f86-29e623c175ab',
  stockRouteWarehouse: '2a311bba-a5cc-44c6-94f2-88e2272928d3',
  stockRouteCateg: '28b65cfa-9036-483c-89bd-9d46456459ac',
  stockWhResupplyTable: 'b9e6c452-8b70-4edc-b0ea-6e0db9e89bab',
  stockRouteProduct: '076091ce-da3c-44ca-8e70-9c1c8f23f119',
  stockRouteMove: '3fcf0774-a231-4d0a-a678-f5617a142743',
  stockPackageTypeStockRouteRel: '2a72c58a-b94e-43cf-88f9-2f72bc417a51',
  stockPackageTypeStockPutawayRuleRel: 'c140e450-ed44-4869-8ccd-24a706c00a55',
  productCategory: '3dcf2c0b-b97d-4a69-a8e6-3c68eaca858d',
  productTemplate: '74c28925-d395-4e48-aa04-e0d7c44ba4db',
  productProduct: '84c297fe-c7e4-4319-8ef3-ea1ecf897cc0',
  stockLocation: 'b85d9ae7-9a1e-4d33-bbe7-4465e3e68934',
  stockPickingType: '0957bcf2-4bbd-4abd-9766-2cd89382eced',
  stockWarehouse: 'bd0d3a63-d732-4181-91aa-b67579bc5d32',
  stockMove: '3f413a74-f136-47fa-aa64-512531b69abd',
} as const;

export const PUSH_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER = '2cf7f6de-f632-49d2-9843-13c95d57dd98';
export const STOCK_RULE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS = {
  layout: 'e077174f-6375-4001-8c0b-af17df40fd0c',
  tabGeneral: 'fdb61bfa-9fc9-4836-b6a3-c67ebde08cd9',
  tabPushFilter: '1aedc9fa-78d3-470b-b49d-c1aea5727155',
  tabTimeline: '8cdf24cf-3091-4499-a32b-1c76b6b45772',
  tabNotes: '4cef3f8c-66f3-401e-9f74-6b4e6fce591c',
  widgetPushFilter: '998d70d1-544d-44ff-874f-6b44a33ce71c',
  widgetTimeline: 'abede5d6-eae0-4c1c-a437-c2d147b8e98b',
  widgetNotes: '6e7f8e92-253a-4d98-9533-fe85afad06ad',
  generalWidgets: {
    name: 'a33d707f-92d8-4f75-8359-f204b9fcf89e',
    action: '99f4bd48-553a-47d2-92ab-d9852b0e0f9e',
    locationSrc: '874d0613-9acc-4176-b7b5-d7b49e5e46bf',
    locationDest: '3d3cf6c1-4045-44ff-9947-0fe9359ef38d',
    pickingType: 'd9ebdbba-28e6-4fc0-a409-c7b67d4c730e',
    procureMethod: '5be8cf3d-9b0b-4c36-87b3-03dc3118508d',
    auto: '78cea680-e4b3-4da4-92c2-c120240b028c',
    route: 'c0874399-012a-4681-bd40-280d7a8c4d02',
    warehouse: '69ba52dc-40ed-4bd0-8de2-297d729031cb',
    sequence: '8ed4d937-9d1a-47b0-8db3-e21378674536',
    delay: '39714b3c-cf24-4a27-9e27-283270334977',
    locationDestFromRule: 'a65612be-7a63-4955-ab1c-c6c30ca97691',
    partnerAddress: '8ef1ab30-b576-4766-90d5-c5ea461e93a1',
    partnerAddressPerson: '67b79140-0972-4f05-a73b-87d2a03e1427',
    propagateCancel: '3fb9a1b5-a53b-41e6-a1ac-ae18d14040ff',
    propagateCarrier: '2c4cffa0-fe48-4a10-a484-3f1df4ffe257',
    active: '93eedc44-eebb-42c1-a3ab-bc804e7726d4',
    ruleMessage: '97a515ec-db60-4051-8189-c53786b7d307',
  },
} as const;

export const REPLENISHMENT_HORIZON_DAYS_VARIABLE_UNIVERSAL_IDENTIFIER = 'dd8435f4-2b74-4bf6-b820-ce420138cb75';
