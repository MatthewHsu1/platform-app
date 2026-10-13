export const STOCK_PICKING_BATCH_OBJECT_UNIVERSAL_IDENTIFIER = '5f7e8078-1c1b-4b66-86a5-dd1f1fdf5fb0';
export const STOCK_PICKING_BATCH_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'ae2ac173-42c9-4177-ac56-7c8f3708c011',
  description: '6aa432a3-5e43-45fc-b494-9f797cb7fc0b',
  responsible: '83ad4a77-2b03-4ab6-a747-cd4fa8b96b8f',
  state: '99c443b7-db65-42d3-b034-74994997e02e',
  pickingType: '17a3497e-febf-4862-a444-06041d4a7bde',
  scheduledDate: '517659a6-b47b-4855-8a85-a923397d918a',
  isWave: 'e834c854-88d5-4a9b-bb10-eda59eda6b22',
  pickings: '6e333f0a-9018-4fe0-a29d-7b08e3fb3ebe',
  printouts: 'be624fa6-7565-4a31-b2e6-d8fa496d1ad5',
} as const;
// Fields this module adds to objects of other modules, and the inverse lists.
export const STOCK_PICKING_BATCH_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  pickingBatch: '2197c405-93d1-40cb-a3ff-0bda8b53233f',
  pickingBatchSequence: 'f2ff0af2-3628-4c17-8fd3-53320cdb4b7c',
  pickingTypeBatches: 'c8ad14b4-7cab-4c69-98d2-f55efd39bfce',
  workspaceMemberBatches: '3e28585d-70c9-40cf-9ff1-d363b8749975',
  autoBatch: '471fb1d6-3af8-4ef4-b6ec-61a63917d598',
  batchGroupByPartner: '211d3da8-015e-4ac7-84c1-5e9c00868703',
  batchGroupByDestination: '88ae8552-0f4c-4192-a7bb-50a4a088635f',
  batchGroupBySrcLoc: 'b8d9f39d-a1e9-4f1c-9889-6e26bf2abfea',
  batchGroupByDestLoc: '78d68578-4648-4064-a4a8-d441aaa5551a',
  waveGroupByProduct: 'ccba1a9d-717c-4eca-ab5a-8575b65384f2',
  waveGroupByCategory: 'b0e2edec-93f1-4b55-b19e-95061fff6f75',
  waveCategories: '192b15eb-14b8-496c-a10c-5b77c57464da',
  waveGroupByLocation: 'fa426501-acc3-49f2-86b8-db22f3006059',
  waveLocations: 'e6450fbf-5678-458d-8ade-c6fbbeeed5d5',
  batchMaxLines: '4c162f82-7e57-4858-9384-5b8b43d95bc1',
  batchMaxPickings: '51321f63-f19f-40e7-815b-42c5eb14aea4',
  batchAutoConfirm: '0860593b-2299-4e36-a358-70da0723c688',
  countPickingBatch: 'e8214112-d49b-49ac-bf65-c6ebfb9953aa',
  countPickingWave: 'fa504314-25bf-4108-a283-0aae0dc26675',
  productCategoryWaveLinks: 'ad02fc34-8154-4f14-b2dc-6cf40d9eae4e',
  stockLocationWaveLinks: '6dba5bc4-c2ac-4903-bfb4-14cb05c9725b',
} as const;
export const PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER = 'fe1cc151-3c85-4084-a099-7106db9e547a';
export const PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS = { stockPickingType: 'f30302cd-08cb-4b48-a705-416bf30f34e1', productCategory: 'ede0dae8-b3b3-4fb8-9aec-6a9a3682f329' } as const;
export const PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER = '495ef843-7b54-4ffa-ae7e-b05060188ed2';
export const PRODUCT_CATEGORY_STOCK_PICKING_TYPE_REL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = { stockPickingType: '55d55429-992c-4839-a344-ea16d6390be8', productCategory: 'b26d6668-e58e-4ece-90d1-327adf463209' } as const;
export const STOCK_LOCATION_STOCK_PICKING_TYPE_REL_OBJECT_UNIVERSAL_IDENTIFIER = '973bf8e0-7434-4ba1-ac94-427e7347649a';
export const STOCK_LOCATION_STOCK_PICKING_TYPE_REL_FIELD_UNIVERSAL_IDENTIFIERS = { stockPickingType: '251ca5a9-6ae3-44ea-8563-ae766b40dd3d', stockLocation: '8455dd0c-b396-4d8b-92b3-361916b42494' } as const;
export const STOCK_LOCATION_STOCK_PICKING_TYPE_REL_PAIR_INDEX_UNIVERSAL_IDENTIFIER = '8f7a5e97-c5a4-4f88-a13a-5ec4b10bfb32';
export const STOCK_LOCATION_STOCK_PICKING_TYPE_REL_PAIR_INDEX_FIELD_UNIVERSAL_IDENTIFIERS = { stockPickingType: '766c13a1-dd64-4aa4-b4d4-386f8d0abe4e', stockLocation: '5cc07fc5-55df-4525-ac5e-ddebe5705962' } as const;
export const STOCK_PICKING_BATCH_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  waveCategoryLinks: 'd512e941-e041-4db3-93e6-dace41e247bb',
  waveLocationLinks: '175de344-c813-4bb7-8348-13a6a520ac08',
  batchTrigger: '38dde144-e715-47d4-a682-f247db88ba80',
  confirm: 'a158e1a7-477c-4aac-9a19-58d32c6840c3',
  checkAvailability: 'f1bf7535-0991-44b9-9356-3642b6f7b70c',
  cancel: '226fb3a5-39e0-41c1-ae60-db96bb999113',
  unreserve: '7c247324-bb57-4496-81ea-f5b951b595d1',
  merge: 'e695f651-daab-4a5e-bf93-f8362f922a9d',
  putInPackLines: '68443a43-08de-46f6-b869-eddd4937e38d',
  validate: 'd9867012-c550-42bb-8239-678e47980401',
  addToBatch: '9a87bd05-20a1-4dfa-a9f6-e7ac33196f3c',
  addToWave: 'f1aaa96e-065f-4ba7-a62f-14cf61d8ba4b',
  addToWaveLines: '47a1cbee-df26-4bfc-90c4-cc13154f1c97',
} as const;
export const STOCK_PICKING_BATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS = {
  confirm: 'aeec422a-7680-4cae-a7e8-c1e78999fd6b',
  checkAvailability: '78be4ba5-b319-42c0-af25-d83d3a8026b3',
  cancel: '2bb7077c-158f-487c-8caf-e918492f96c3',
  unreserve: 'd782c272-7809-4b94-a0fd-b7d8f601fe16',
  merge: '7f53230d-a90e-4631-83c7-af2e3359e8f8',
  putInPack: '2281fffc-2807-4f48-b629-c8776e32f8a5',
  validate: 'f2fdb112-5d86-43fd-9802-e39b81313e4c',
  addToBatch: '3f8d8ac8-a534-462d-8484-06a2abb0d609',
  addToWave: 'c6d16565-035f-43c8-9875-2e570d267f58',
} as const;
export const STOCK_PICKING_BATCH_COMMAND_MENU_ITEM_UNIVERSAL_IDENTIFIERS = {
  confirm: '49f963c7-b0bc-4d74-ad8c-6428e73ca693',
  checkAvailability: '9615b1b6-8fc4-4e71-94be-68fc93f4225f',
  cancel: '9435d878-b4ce-4e17-9a6d-749faea78a70',
  unreserve: '6e35143f-c7e0-4011-8386-a4e23543bf31',
  merge: 'efc3a411-f08a-4601-a763-af4089eecb8a',
  putInPack: 'f4e44f25-f54f-41a8-a2f7-82069df35bc5',
  validate: 'a14df603-98b7-4732-9080-97265e2f3b22',
  addToBatch: '0ddb754a-a5fa-4da0-b3cb-09b9be821292',
  addToWaveFromPickings: '09780d53-1b04-403f-ba75-7ecd61cf72a3',
  addToWaveFromLines: 'c9177c56-1a1e-4056-b80a-c6ccca9061d8',
} as const;
export const PREPARE_WAVE_VIEW_UNIVERSAL_IDENTIFIERS = {
  view: '8dab1c8a-b716-453b-a78d-0d7f58a1ddda',
  fieldPicking: '020f1414-3aa1-40b3-9b41-d7e43dff13b3',
  fieldProduct: 'c63e546a-9774-47c4-bb3e-aba27ec5dd7e',
  fieldLocation: '570f7996-8354-4928-a5f2-12de597c825c',
  fieldLocationDest: '036586cb-0274-4a28-86cf-ef3499e28140',
  fieldQuantity: 'e5af394f-a8b7-4e41-899d-fc6c6b10b231',
  fieldUnit: '0645f901-d3cf-4b87-b427-0b966b4ebf56',
  filterState: 'bce8fe3e-3ee8-4e92-8ad2-03ee8b2228d8',
  filterPicking: '439cab6e-533c-42a7-b82f-0d5b27017bf6',
} as const;
export const STOCK_PICKING_BATCH_ROUTE_PATHS = {
  confirm: '/stock-picking-batch/confirm',
  checkAvailability: '/stock-picking-batch/check-availability',
  cancel: '/stock-picking-batch/cancel',
  unreserve: '/stock-picking-batch/unreserve',
  merge: '/stock-picking-batch/merge',
  putInPackLines: '/stock-picking-batch/put-in-pack-lines',
  validate: '/stock-picking-batch/validate',
  addToBatch: '/stock-picking-batch/add-to-batch',
  addToWave: '/stock-picking-batch/add-to-wave',
  addToWaveLines: '/stock-picking-batch/add-to-wave/lines',
} as const;
