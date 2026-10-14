// Universal ids of the module that links opportunities and service orders. New ids are random UUID v4 and never
// change after release.

export const FIELDSERVICE_CRM_FIELD_UNIVERSAL_IDENTIFIERS = {
  crmLeadFsmLocation: 'baa652cf-1514-4ae4-86d2-8be0cd69a687',
  crmLeadFsmOrders: '7a799c2e-3d46-448d-9edb-ec2ae2ed5bff',
  fsmOrderOpportunity: '82c487ce-c3f9-4dfc-9750-ed4e30bffd7a',
  fsmLocationOpportunities: '25adcf7b-6ff6-4cd1-9ebe-c37bac45794f',
} as const;

export const FIELDSERVICE_CRM_ACTION_UNIVERSAL_IDENTIFIERS = {
  createOrderLogicFunction: '15d78f33-c466-4494-9e2d-fe034e853b9a',
  createOrderFrontComponent: '728863ea-7865-4a98-b571-e51b7488cda5',
  createOrderCommandMenuItem: 'd30afbb2-2c19-40f7-93de-377908ebc791',
} as const;

export const FIELDSERVICE_CRM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER = 'b28b1cfd-75c5-43a9-b3b2-47ea4b815b43';

export const CREATE_ORDER_FROM_LEAD_ROUTE_PATH = '/fieldservice/lead/create-order';
