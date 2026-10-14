// Universal ids of the service order checklist. New ids are random UUID v4 and never change after release.

export const FSM_ACTIVITY_OBJECT_UNIVERSAL_IDENTIFIER = 'ff2b004b-aadb-4fcd-bac5-5250ccfdb808';

export const FSM_ACTIVITY_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '2249eef3-3562-4e20-9249-4acec78360d5',
  required: '0175f9e8-61dc-42ba-978a-3f5fd5fdec0e',
  sequence: '77e7c4a4-5919-474f-81f7-038150bec119',
  completed: '001a68ab-4342-4030-aa9a-c56187fe42db',
  completedOn: '7c6c4926-bec9-4300-b95b-c86ec2dd400f',
  completedBy: 'ac5aba43-eec7-47c3-b984-fe0f58d81425',
  ref: 'adbaba07-eeaa-41e1-a094-9918f6a1fc66',
  state: '1fd59591-ac7d-4b91-8257-4e1bc5402efe',
  fsmOrder: 'd03d2e78-539a-4a55-b29f-8d3d393e9607',
  fsmTemplate: '51ac84ed-7882-4755-8423-1dacd2a89a81',
} as const;

// Fields the checklist adds to objects of other modules.
export const FIELDSERVICE_ACTIVITY_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  fsmOrderOrderActivities: '5da84a7b-8f6f-40bd-bfa6-fe15354d6c97',
  fsmTemplateTempActivities: '710ec5cf-ff92-491b-9bbc-0e179bd8bbf1',
  workspaceMemberFsmActivities: '278e90bb-1ccb-4d18-bbe9-88b918cbd60a',
} as const;

export const FIELDSERVICE_ACTIVITY_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  fsmOrder: 'ebb4f361-19a3-43a0-bcec-872fdef2c1cb',
  fsmTemplate: 'a7993e59-1b84-4039-bb31-de0a40bc4bca',
  fsmActivity: 'c5388533-06fb-4548-8973-66cfb9a423fe',
} as const;

export const FIELDSERVICE_ACTIVITY_ACTION_UNIVERSAL_IDENTIFIERS = {
  doneLogicFunction: '330ad35a-3cbe-433b-8228-a49a37bb926e',
  doneFrontComponent: '87e62e40-f8d9-4714-a692-fd60803ee25b',
  doneCommandMenuItem: 'dfbf2557-1bae-4851-9c69-6d67b96e1dc8',
  cancelLogicFunction: '249f7477-52d0-47fa-8c26-90cc7a814343',
  cancelFrontComponent: '77f949d0-4dfc-4616-92fb-c3854c7b4103',
  cancelCommandMenuItem: '95384b97-3414-4eb9-9a64-651a6b409320',
} as const;

export const FIELDSERVICE_ACTIVITY_PAGE_UNIVERSAL_IDENTIFIERS = {
  orderTab: '161ab962-8f1e-4c90-a31d-5d4c7b5c4a25',
  orderWidget: '85defa5e-4ecb-454a-a54e-bd72df9f81b9',
  orderFrontComponent: '32ff3012-7784-40ec-8bea-9de01a3536ba',
  templateTab: '6f35d833-3508-4f50-b9e2-e26a440a98d0',
  templateWidget: '7a7d9605-4bda-4474-8b6b-23551ed75550',
  templateView: '73aed863-0adf-483b-8c9e-b0991b08acf7',
} as const;

export const ACTIVITY_DONE_ROUTE_PATH = '/fieldservice/activity/done';
export const ACTIVITY_CANCEL_ROUTE_PATH = '/fieldservice/activity/cancel';
