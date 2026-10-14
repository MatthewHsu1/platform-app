// Universal ids of the module that makes equipment a serial-numbered product with a warranty from the product. New
// ids are random UUID v4 and never change after release.

export const FIELDSERVICE_EQUIPMENT_STOCK_FIELD_UNIVERSAL_IDENTIFIERS = {
  fsmEquipmentProduct: '48e06a80-55ca-4f2a-9ff0-f24c12ce24ad',
  fsmEquipmentLot: 'e0ec2d4b-7bf0-4c6f-bd5a-d4d7284687f7',
  fsmEquipmentCurrentStockLocation: '5f5b414d-a40e-4ad8-bc5c-10c6ca53eeb3',
  productTemplateCreateFsmEquipment: 'e47fa448-b282-4e6c-ad4e-0a837b1626b3',
  productTemplateWarranty: 'a569d53f-f90a-43cf-aaab-0b43b7cf1618',
  productTemplateWarrantyType: 'c6b0095c-b665-42ec-be1f-e99123351b71',
  stockPickingTypeCreateFsmEquipment: '7083002e-b7b8-4fc6-8144-6d3a356b4325',
} as const;

export const FIELDSERVICE_EQUIPMENT_STOCK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  productProductFsmEquipments: 'f1167b00-e4a6-4a57-a795-30de13b87168',
  stockLotFsmEquipments: 'ac1ddf2d-6100-4588-9135-1a611ca18aaa',
  stockLocationCurrentStockFsmEquipments: '683cae89-c457-4fd9-8d77-0800a5466963',
} as const;

export const FIELDSERVICE_EQUIPMENT_STOCK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  stockMove: '7932cb78-7ff2-43d9-b56a-ffc193dcc0f5',
  stockLot: '8a556aba-73be-4922-adf3-5455676bf875',
  productTemplate: 'acc59218-840d-4934-8737-c7d3b375d343',
} as const;
