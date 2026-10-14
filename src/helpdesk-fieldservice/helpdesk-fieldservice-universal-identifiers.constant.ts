// Universal ids of the module that links work cases and service orders. New ids are random UUID v4 and never
// change after release.

export const HELPDESK_FIELDSERVICE_FIELD_UNIVERSAL_IDENTIFIERS = {
  fsmOrderTicket: '480620b2-fae0-45a1-b4d9-ede737cfe8c3',
  helpdeskTicketFsmOrders: '05f0933c-00a6-433f-a3a1-c83e60f63478',
  helpdeskTicketFsmLocation: '54f224d7-1471-40b2-85e9-7a40e88555c2',
  fsmLocationTickets: '5c236003-6cb5-4288-9aa3-80f03e625449',
  fsmLocationTicketCount: 'd3416800-dd26-4f99-a113-7399fe10c753',
  helpdeskTicketResolution: 'b603de6b-502a-47a6-8b41-2b34f95c79ff',
  personServiceLocation: 'ad0581ed-acee-48a6-96f3-44c864fb5c55',
  companyServiceLocation: '9e8a6763-0b6d-4ea6-b137-372331eef969',
  fsmLocationServicePersons: 'ea94d006-313c-4deb-92cf-88eb5b7df027',
  fsmLocationServiceCompanies: 'd8028495-5a26-4dc1-b7b8-dc44ff95e31b',
} as const;

export const HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS = {
  createOrderLogicFunction: '0a6190f3-4edd-4b16-9ab4-85d9894a35d1',
  createOrderFrontComponent: '7382369b-62b8-4981-91e6-4067e98ae211',
  createOrderCommandMenuItem: 'f2a3eb50-f7ff-47a4-a981-77028635559d',
  closeCaseLogicFunction: '0793676c-f826-4eb0-8683-52ebfa82f039',
  closeCaseFrontComponent: '8674e209-b1bb-4d6d-9137-98f0ee2bd27f',
  closeCaseCommandMenuItem: 'f59de9c9-d9a6-4091-8c2a-bd253b40e722',
} as const;

export const HELPDESK_FIELDSERVICE_PAGE_UNIVERSAL_IDENTIFIERS = {
  caseServiceOrdersView: '3800f429-ac1a-49d8-a712-b48e75632b9d',
  caseServiceOrdersTab: '71a0515f-7133-4f78-8d4b-aa2da7d1ac03',
  caseServiceOrdersWidget: '1a70d6c7-c0d1-42ed-8989-2eaddca4bf32',
  casesWithOpenOrdersView: 'fb3f97db-8e23-4041-82b7-a118877b4977',
} as const;

export const CREATE_ORDER_FROM_CASE_ROUTE_PATH = '/helpdesk/ticket/create-service-order';
export const CLOSE_CASE_ROUTE_PATH = '/helpdesk/ticket/close-after-service-orders';
