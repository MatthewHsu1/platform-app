// Universal ids of the work case to opportunity link. New ids are random UUID v4 and never change after release.

export const HELPDESK_CRM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  crmLeadTicket: 'dff3ab2c-50b1-4e4f-b21e-24a967b863cf',
  helpdeskTicketCrmLeads: 'c80e95d1-0b7e-4047-9e4c-3e587e329811',
} as const;

export const HELPDESK_CRM_ACTION_UNIVERSAL_IDENTIFIERS = {
  createOpportunityCommandMenuItem: '411389d5-2a52-4c45-b5e3-00fdf9b76a25',
  createOpportunityFrontComponent: 'a4ae42e6-9e8b-4b08-8b7f-b611b849312f',
  createOpportunityLogicFunction: '919ad9e9-8468-455f-8550-13d84b985a75',
} as const;

export const CREATE_OPPORTUNITY_ROUTE_PATH = '/helpdesk/ticket/create-opportunity';
