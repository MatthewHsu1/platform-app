// Inventory sidebar. The four group folders stay unused: Twenty refuses an item
// inside a folder inside a folder, so every entry sits in the one Inventory folder.
export const INVENTORY_NAVIGATION_UNIVERSAL_IDENTIFIERS = {
  folder: 'd9697c19-2148-49be-9ce0-4dead8a3fe42',
  operationsFolder: 'd455817b-4c91-4fc6-b3ba-2775b5e733d7',
  productsFolder: 'c78b270e-bed2-4f64-ae82-a654828d9ede',
  reportingFolder: 'f4dda36f-7d88-4eb7-87e4-9ebe1d2ff8ac',
  configurationFolder: '2efd951d-520b-42e0-a2a8-5bc038644d80',
  transfers: '8a4a8b52-a198-471c-b5bb-8e73463e7fb4',
  scrap: '85ecb39a-1ef0-4ca5-a660-d56bb5df3c91',
  products: 'd5060482-9f01-46a4-9569-327f7fe21e0c',
  productVariants: '7bf55bbe-f615-42d5-ac27-086f0e003647',
  lots: '5932c49f-aa16-4130-8ca7-92511a153f4c',
  packages: 'a71f261c-4708-4695-8151-42e2e917776f',
  warehouses: 'e6efcf18-249c-4860-a5b1-129f6e38dc52',
  locations: '9b282ff6-b770-4188-881f-f88bd47bf58c',
  operationTypes: 'f393632f-b618-4bef-9bb1-8f50b57c2d5a',
  routes: 'e66529b3-348b-41f4-9243-a5353910a7a5',
  rules: '46590506-c814-47cc-b965-8a9626a664da',
  putawayRules: '8c57fb2a-ec10-4a32-83a0-5a31594740c5',
  storageCategories: '3e2c0d5d-2e62-4e6d-ba58-bee2d917262b',
  packageTypes: '2ba5671a-8fc6-4955-9b1a-17d790a0d35a',
} as const;

export const INVENTORY_FOLDER_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER = INVENTORY_NAVIGATION_UNIVERSAL_IDENTIFIERS.folder;

// The list each Inventory sidebar entry opens.
export const INVENTORY_LIST_VIEW_UNIVERSAL_IDENTIFIERS = {
  transfers: '4690de03-9e4b-4a0e-ad1b-a22f83597f27',
  scrap: '1adb050e-264f-4156-8504-c35ecfebf947',
  products: '9607ef9b-2777-4ef3-9b3b-4ca7381b02bd',
  productVariants: 'c57ef597-caf2-434d-bc15-321f98802e39',
  lots: '724bd49d-962f-4588-ba2f-c966e3565cf7',
  packages: '0493e52d-bfa5-4af8-b01a-2cffda7093b6',
  warehouses: '806f8a98-c88c-42ca-aa35-9d706fff5a88',
  locations: '78f907ac-e16b-42eb-84b1-b809d899bf11',
  operationTypes: '97f67aff-38a9-48be-8f47-04b2c7a7e21c',
  routes: 'fd409738-32bd-4a2c-882d-28f2d012c802',
  rules: '976ebd14-51c2-4b65-81f5-e9182fadbdae',
  putawayRules: '0a8970ba-388f-4f28-b5c4-d43a4bb8f4c3',
  storageCategories: 'ab7ef0d3-90b1-44c7-a569-8ba161814ee7',
  packageTypes: '87af5eb8-ee0d-4857-a988-cb5d50e59321',
} as const;

// One view per related table on a record page: without it the table shows chips.
export const STOCK_TABLE_WIDGET_VIEW_UNIVERSAL_IDENTIFIERS = {
  pickingMoves: '48e762f2-f263-4731-93e5-fc32a54fab9c',
  pickingMoveLines: '41e666db-2dcc-4e21-863c-5d41dbc1680e',
  pickingPackageHistories: '7e117e3e-f650-4c4d-b29f-9e9f3fbb8f77',
  moveMoveLines: '8f0c1443-1b39-481a-9502-c94a706280c7',
  moveOrigs: 'd7f78b88-4606-4b07-bd6d-3f66e64dd360',
  moveDests: 'ec324224-f5de-4b34-8e6c-d28bc3bbf1db',
  productQuants: '4cf97573-3c13-4860-a719-2803c5f78b7e',
  productLots: 'e2193d3a-6fdc-4d64-a5c8-056b7e42b0c1',
  productOrderpoints: '0c470b18-fedc-40d9-9d14-8971ef2b3aa9',
  productPutawayRules: '6253e6a7-0bcd-4888-8edb-7aacb476f3ff',
  productStorageCapacities: '756a0d4f-f8c5-4176-bd6e-28c26f4baa1c',
  locationQuants: '2327c8d7-6af6-4faa-bfc8-bb4718217365',
  locationChildren: '575d0a9a-b387-45dc-ae0b-11ae4957c204',
  locationPutawayRules: 'a79725f6-2dd5-4e12-a941-446e79de4253',
  warehouseRoutes: 'd060eab3-17c4-4b0d-a971-27d9569ebf4c',
  warehouseResupplyRoutes: 'a7e9626f-cdf9-4359-acb6-eb04e8ef6977',
  pickingTypeWaveCategories: 'a0b46c17-071e-4e47-ba40-5cdc335c1acc',
  pickingTypeWaveLocations: 'b6e2cd81-6ebc-489d-ab76-e2cf734152af',
  pickingTypePickings: '7968192f-34d6-46d9-a584-c88fbc399c71',
  lotQuants: '997caac9-13e0-4128-b746-02acbde389ad',
  packageChildPackages: '7087c6ab-5e63-4c75-8669-0f650898e2df',
  packageHistories: 'e2459bb5-be12-4ce3-a32b-a4e6189403d7',
  batchPickings: '2a3f2b7b-6bd0-4d33-8ebd-03948aa6b4a3',
  batchMoveLines: '7f3552ce-8e01-4fa6-9515-2d27307b7adb',
  templateAttributeLines: '8de15816-cc4d-4831-82b0-a506c2de8148',
  templateExclusions: '4b15ef4d-e3d7-4beb-9bfa-d846ddf79d38',
  templateVariants: 'a8da9cf9-6eaa-45fe-a446-631150d7c79e',
  templatePricelistRules: '3c09a22e-f9e4-4ec3-b39c-2323a812f943',
  templateCombos: 'c4d6dba0-dba7-49dd-b6df-a026430f9a6b',
  templateSellers: '2332fd55-7bb7-4bed-b778-e30d92da2e6f',
  templateRoutes: '11eeb1c0-976e-40b5-910f-8688ea5359f8',
} as const;

// Tabs the app adds to the record page Twenty makes for each object.
export const STOCK_RECORD_PAGE_TAB_UNIVERSAL_IDENTIFIERS = {
  stockPicking: {
    tabOperations: '54fd1833-32ab-41fd-bbb1-4d2eed3bec2e',
    widgetMoves: 'd5561e49-d081-49a4-98e4-59348c0ad8b7',
    tabDetailedOperations: '80c88312-fe6b-4ac7-9982-ff9af62aa1fa',
    widgetMoveLines: '40555f1b-4998-4694-a990-0ae1975319b5',
    tabPackages: '2d736a1c-706c-4094-a933-4402b0d94b0a',
    widgetPackageHistories: '32c1b711-eee2-417e-b0b9-3f6615eae5dc',
  },
  stockMove: {
    tabMoveLines: '823a5489-cc83-4216-9fcf-8016abfaa4a4',
    widgetMoveLines: '41ea5aff-e6e1-448c-be83-96c03a85fc78',
    tabChain: 'cca22351-576e-405a-91f1-812b396b37f8',
    widgetMoveOrigs: '2378cc75-dd67-4bd9-a0a0-ceab3a9b5ddb',
    widgetMoveDests: '8a99a3a1-32ca-4510-b26f-cb41c33424eb',
  },
  productProduct: {
    tabInventory: 'a21bd16d-ad55-4c41-9199-5182d26546b9',
    widgetStockQuants: 'e8b266f8-6c06-435a-8d74-dc7611b11a1b',
    widgetStockLots: 'eade1561-dd5d-4ae9-b0c2-6b61ba4b5efa',
    widgetOrderpoints: '987eb16b-f96a-45e4-a106-ab5fbde756bc',
    widgetPutawayRules: '6e01a91d-0869-43aa-882f-b94bf43504f7',
    widgetStorageCapacities: '0d5f6aec-47b7-4ceb-b68f-951bc382a377',
  },
  stockLocation: {
    tabStock: '897e8eb5-a963-4dec-8473-e0cbdbbf02fb',
    widgetQuants: '697f12ef-87da-4c2f-8a5c-b355e4d368c5',
    tabChildLocations: '836ee0a7-4d52-4c02-88a5-11ecb00be202',
    widgetChildren: '27a960ef-7640-4411-a74d-15c6313c3309',
    tabPutawayRules: '1f14fd23-848f-4811-9b86-4652adc4cf4b',
    widgetPutawayRules: '8ed43228-7ae8-4059-81a3-b6a12e460f7b',
  },
  stockWarehouse: {
    tabRoutes: '10b594bb-a65e-4be0-af6c-d5d92a99d6e6',
    widgetRoutes: 'fbafee70-e59b-4420-b2b9-7a44de79ecd2',
    widgetResupplyRoutes: '5b6ed40d-0ba1-48aa-913f-929301d3d346',
  },
  stockPickingType: {
    tabBatch: 'dfa162b3-de3d-4d0b-a35c-cc513c29acfc',
    widgetWaveCategories: '22274cdb-a385-40b6-b0ca-6ffa6c369186',
    widgetWaveLocations: '0d8d3e11-9e20-4a04-b559-fc3610a98387',
    tabTransfers: 'abf98938-117b-4c00-94c5-b165f4337bf3',
    widgetPickings: '7dbc5e29-1547-4379-87d2-520168640bb9',
  },
  stockLot: {
    tabStock: '89f314a3-f99f-42d7-82be-b124186f1155',
    widgetQuants: 'baeab2c7-c1bd-48ab-bb8e-88d7d566601f',
  },
  stockPackage: {
    tabChildPackages: '23e00dae-b6ab-46d3-bf7a-de8ed244df56',
    widgetChildPackages: '8e22d9fd-c3e8-425a-a825-5f778d1c7083',
    tabHistory: '67b74502-9905-4864-a826-827753569b06',
    widgetPackageHistories: 'a503ed03-713e-4b3e-91ce-92866d3820b4',
  },
  stockPickingBatch: {
    tabTransfers: '3a78f8f7-fd06-47cf-b492-46048ca44029',
    widgetPickings: 'aca08c58-9af7-4485-b0d9-838f0399aac2',
    tabDetailedOperations: '217138c2-d8cf-4455-8ebd-d0153357105f',
    widgetMoveLines: '518b5d3c-fbeb-4dd7-a8d5-4aa7c05a4e25',
  },
  productTemplate: {
    tabInventory: 'cc841198-43e0-4b9c-b7c5-6146dc6881d7',
    widgetRoutes: '0e7c85f6-62f6-49d3-bbc7-11b76ff65611',
  },
} as const;

// Saved lists of the Inventory module: one view each. Their filters, sorts and
// columns get ids derived from the view id.
export const STOCK_VIEW_UNIVERSAL_IDENTIFIERS = {
  receipts: '317464c4-6b43-4a92-a470-9e1cc29edba2',
  deliveries: 'c0e22b59-8516-4332-8787-88ecc14babc0',
  internal: 'ee5501e2-5c30-4b99-9912-0736530de9e0',
  ready: 'f0b7668f-5d14-41f0-9214-33c31ec4150e',
  waiting: '6a32be16-d97e-44a9-8b1a-7a99d0aa64c1',
  late: '51194025-2600-4b66-b76c-92b1c25fcd1b',
  backorders: '24068fff-b295-4f5e-9fed-de0975cfbc00',
  myTransfers: '76836f48-349a-4fd2-9eb5-17e0da0f938a',
  productStock: 'c67c1c2e-6109-4670-ad0b-d5971de43a2e',
  quantLocations: '5f210844-ee48-461f-939f-bb484a3e5e2b',
  movesHistory: '54f54c8c-8fdb-42f1-95a7-6ff4134e27fe',
  movesAnalysis: '176e0d4c-00b5-4ed4-b68c-e7d00ee0c665',
  expirationAlerts: '6d4b772c-def2-48d5-adfa-d5070a51373d',
  lotsByLocation: '931844e0-c03e-4b96-b3f0-3b668411891f',
  physicalInventory: 'ff1579b2-1cd6-48f7-a0b7-caec0f6a9b29',
  myCounts: '0384fb3b-c9b0-4c34-9f29-4f7638700a67',
  batchTransfers: 'a8aaec13-6ba7-41f8-ba1c-6b5c7b30f6b0',
  waveTransfers: '51edd5fd-358b-460f-98e0-4f7c39e10872',
} as const;

// Sidebar entries that open a saved list.
export const INVENTORY_VIEW_NAVIGATION_UNIVERSAL_IDENTIFIERS = {
  receipts: 'd6934ca6-1bf9-463d-9892-b49e48dfb1dd',
  deliveries: '0814a96c-ee28-4f01-bf1c-8aad3f57a8f5',
  internal: 'aec1deb0-5750-45f4-94a9-f2f0444f48e2',
  batchTransfers: 'ace9b945-2c34-4393-9b0e-ac833e901423',
  waveTransfers: 'f882f097-68a1-4c3f-9c51-2cd25aba90a7',
  physicalInventory: '54416031-2640-4db2-b18c-0a4fc6774de8',
  replenishment: '3678ca54-e6a7-4ba3-af63-d4fb88a8838c',
  stock: '29c518cf-9e46-4c9b-badd-f563b3d2f793',
  stockLocations: '8af69d3c-a909-4fe0-89eb-4289680deb47',
  movesHistory: 'd9da7733-172c-4e42-84e6-7d05a7f8240e',
} as const;

// Moves Analysis page: charts of done moves above the done-moves list.
export const MOVES_ANALYSIS_UNIVERSAL_IDENTIFIERS = {
  pageLayout: '926bff6a-bef2-42bd-94ee-17026573dd06',
  tab: 'e554d60b-aaac-4d1a-8c31-0af7786a25d6',
  widgetByProduct: 'c3d11ba1-2152-4616-8f05-7d7ea3a7ff13',
  widgetByType: '655ff412-50f5-4a3a-8667-1a783a83559c',
  widgetByDestination: '2ca50abe-40fb-4f7c-baf5-740e280b0577',
  widgetByMonth: '039b520e-63d4-4f2c-a415-c64dd3434983',
  widgetCountByMonth: '6aa40ca7-b997-4509-945f-edec6a9d4a38',
  widgetTable: '7c3db352-1328-464a-84f7-1a1dd4e40d47',
  navigationItem: 'f420412c-9e9f-4308-a42c-eada0985e01a',
} as const;

// Fields the reporting pages group by.
export const STOCK_PICKING_TYPE_PAGES_FIELD_UNIVERSAL_IDENTIFIERS = {
  completeName: 'cdf2ace4-3e76-4922-93cb-162831968c5f',
} as const;
