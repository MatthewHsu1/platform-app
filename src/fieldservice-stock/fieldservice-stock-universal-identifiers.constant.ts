// Universal ids of the module that puts parts on a service order. New ids are random UUID v4 and never change
// after release.

export const FIELDSERVICE_STOCK_FIELD_UNIVERSAL_IDENTIFIERS = {
  fsmOrderWarehouse: '8c6c5ef2-5d27-4448-815c-be998cf97d35',
  fsmOrderPickings: '0fab23cb-bb8b-4dbb-9634-2291b113a7ad',
  fsmOrderMoves: 'a33d4392-fce8-445c-9a9d-78c0b78f9f62',
  fsmOrderReferences: 'cb896b8c-4af3-4e3c-89a2-0b2b76769c17',
  fsmOrderDeliveryCount: '8380ba3f-b009-4f8b-a90c-fb59d5cae252',
  fsmOrderReturnCount: '614a2719-d3f6-491c-a268-085602ae26bd',
  fsmLocationInventoryLocation: 'b39f65c6-3c06-4577-9c6e-fdd1a553e7f9',
  fsmLocationShippingAddressPerson: '98219dee-a9e5-4bc9-b070-1e2dbdf1b87e',
  fsmLocationShippingAddressCompany: 'c244fcad-a874-4d62-886a-eee5a9c1f3ab',
  fsmPersonDefaultWarehouse: '5b222122-bf27-4846-8cde-1047a6b489f1',
  resTerritoryWarehouse: '04e40aff-ada9-4f46-9a53-bddb0390c262',
  stockPickingFsmOrder: '9b448407-27a0-46ad-bf6a-877e5cc24dad',
  stockMoveFsmOrder: '4c330787-3c9e-41c1-ae0e-b6a8696c943d',
  stockReferenceFsmOrders: '52164623-164f-4d3c-b1ea-98bbae44a9ab',
} as const;

export const FIELDSERVICE_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  stockWarehouseFsmOrders: 'f8aa3fcb-f1f6-4a93-bfe6-991135f72b39',
  stockWarehouseFsmPersons: '99b17d4b-bf1b-441d-b774-7af3a1b54c68',
  stockWarehouseResTerritories: '50fbe1b0-e552-4ff7-a47c-afb26a8426b6',
  stockLocationFsmLocations: '0cc59a9f-583d-4e64-8d90-493d1461cece',
  personShippingFsmLocations: '16d4d483-f9d9-4cf8-973a-6b39bb5077e4',
  companyShippingFsmLocations: '12c19faf-7a5c-41c0-b46c-fe418740fa84',
} as const;

export const STOCK_REFERENCE_FSM_ORDER_REL_OBJECT_UNIVERSAL_IDENTIFIER = '036c425f-e71d-4a0d-add6-f767b31c4851';

export const STOCK_REFERENCE_FSM_ORDER_REL_FIELD_UNIVERSAL_IDENTIFIERS = {
  reference: '8c43bbb1-b354-4415-a13b-cb70693b2e82',
  order: '6bc037ff-3f25-4e5c-9aa2-f5ab19a17b32',
} as const;

export const STOCK_REFERENCE_FSM_ORDER_REL_INDEX_UNIVERSAL_IDENTIFIER = 'b81b5203-679b-43a1-ab60-d13d52f41825';
export const STOCK_REFERENCE_FSM_ORDER_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = 'c1a329db-1bb7-4981-8144-7334c70fadae';
export const STOCK_REFERENCE_FSM_ORDER_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = '60cf202a-837f-413e-aab7-e2224e723291';

export const FIELDSERVICE_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  fsmOrder: 'dc6343bb-6e1c-4d63-b232-22b0d6c81391',
  fsmLocation: '81b57fb8-5bce-4697-b3ff-b502eab93720',
  stockPicking: '6531b7f4-ea8f-4d77-b837-9c2a1c1abb36',
  stockMove: 'f1046f23-ba5d-41c6-9503-04ea157bb592',
  stockReferenceFsmOrderRel: '39a5a4bd-a8ee-4936-b8c6-2a814a35f123',
  person: '3cdad0ab-79a8-483e-a8ce-eedf1773a5c7',
  company: '8b510e86-eb1d-40f8-a23b-4a541cd07b40',
  stockWarehouse: '54e78bab-091d-4522-9e79-6aea7b3645d5',
} as const;

// The Inventory tab of the order page: its moves table (with the view behind it) and the card of its location.
export const FIELDSERVICE_STOCK_PAGE_UNIVERSAL_IDENTIFIERS = {
  tabInventory: 'a9607d49-a6c3-4224-97ca-6cf63acec71c',
  widgetMoves: 'e734114e-faa5-488e-b23a-416cf7d73543',
  widgetLocation: '5f7334a1-1de6-49c7-a4fe-7a963837bdb7',
  viewMoves: 'c04281fd-78b0-4786-80c4-597608129367',
} as const;

// The view location the module makes, found by this key after staff rename it.
export const FIELDSERVICE_STOCK_SEED_KEYS = {
  fieldLocation: 'fieldservice_stock.stock_location_field',
} as const;
