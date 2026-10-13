// Universal ids of the Work cases core module. New ids are random UUID v4 and never change after release.

export const HELPDESK_TICKET_FIELD_UNIVERSAL_IDENTIFIERS = {
  number: '939857d0-f0f8-49d4-93b1-12e8425d4693',
  name: '86d92567-bf24-48e5-bd6a-8651ebd8769a',
  description: '20d59e53-f858-42dd-89ee-7a1a314fced0',
  assignedUser: '36a1ecbc-c8aa-421a-aec7-01c61d57ca7e',
  stage: 'ab3e4837-6eb1-487d-9e65-ac5dfdc225a0',
  person: 'b2d601fb-7f8a-48f4-98a9-f2cc5bbc7ec9',
  company: '6d5d17d0-e819-4543-8bad-bcc0fe219cc3',
  partnerName: 'eec33136-73dc-4625-9008-af9055e32b9f',
  partnerEmail: 'a7a31d83-a81a-4806-89a9-f5b4d2c6f2b4',
  team: '9ed53321-9037-4d25-811a-11770b46b634',
  category: '3a22ede2-671b-449c-911e-f8201f50cd29',
  channel: '82b1b35c-6935-4061-9699-cbdbc97656b8',
  priority: '7e51009b-4877-4230-947d-306bcba067e7',
  kanbanState: '3b34ee97-69b7-44b6-bd05-8bfba34fba8f',
  duplicate: 'df63276b-1da9-477d-a5d8-373f30d41bce',
  duplicates: '5be0e0ff-5001-436d-98e3-4f6c413c4203',
  lastStageUpdate: '8dbf2a74-8c50-4385-8671-e126090e03e7',
  assignedDate: '21a53d8d-a11e-4a73-8a35-1e4b2ad92a2d',
  closedDate: '19efaf0e-af61-4cc1-890f-01535e8702d8',
  unattended: 'f2196fef-e3e9-4313-a18f-96b5ce38dee2',
  active: '5272e294-2f3e-40c3-a8c0-3f6d9913adf7',
  tags: 'e9888ac0-60aa-4809-bafd-27900decda97',
} as const;

export const HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER = '18116072-3846-49f6-abdd-2956c8470050';

export const HELPDESK_TICKET_TEAM_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '1deaedf9-4b8b-494b-bb14-4b4474e498bc',
  sequence: 'ee27d855-91fa-4cc9-a157-da2a356f4459',
  active: 'a7cc6baa-81d0-4379-bdaf-0028f3abd93f',
  leader: '141cc5a3-b871-484e-8515-bd6d556be334',
  parent: '52bb910e-6290-4dc7-902f-c612275a8db0',
  children: 'c19b7d1d-7030-4ecc-9215-0bf5c9637ab2',
  completeName: '915c1475-1781-4aca-8fe4-b2478b16615b',
  todoTicketCount: '86e2dcad-32d1-4fa0-b818-8c2e8480ae6f',
  todoTicketCountUnassigned: '3b33458a-c876-48c2-b73a-fee3531537d9',
  todoTicketCountUnattended: '656c1719-d315-42bc-b7da-58270d246987',
  todoTicketCountHighPriority: 'f05dbb99-3d4c-4e30-8637-bb9929281873',
  members: 'b591f232-05fc-4af6-9d83-5314c81b6c53',
  categories: '6138e3cc-b15d-4bf8-bb58-16b4a7d0b474',
  stageLinks: '6e9e89bb-8524-4fcd-9fb4-3f4baa7da1f0',
  helpdeskTickets: '107889d2-2126-4218-a46f-f73c3f0fa7f1',
} as const;

export const HELPDESK_TICKET_TEAM_OBJECT_UNIVERSAL_IDENTIFIER = '4f8586d9-f559-464c-9972-4aef803ee133';

export const HELPDESK_TICKET_STAGE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'eb179a27-68ff-45ef-8512-d6d4da7d1f50',
  description: 'd13ba6c7-0e2b-4494-b942-11d10adf9d80',
  sequence: '5830168d-532d-486d-a94c-78f6d343a8ef',
  active: '46bb7e68-ed08-4bed-9f46-10817b6ce572',
  unattended: '3db71709-79a8-4cb1-971c-bf1adbd7d16b',
  closed: 'ebb70849-9a0b-48eb-a9a8-15e36ea5f6c0',
  fold: '38717736-8f1b-4eab-93dd-676472ff344e',
  teams: 'e522e931-049e-461c-a819-b7b73d878ae2',
  helpdeskTickets: '5dc9759b-4268-4bb8-a0ce-6e441e650c22',
  seedKey: '904e55eb-cab1-4ea8-a8e5-fd0f192c8233',
} as const;

export const HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER = 'b25afecd-09a6-4269-9ef1-6cf4f2820acb';

export const HELPDESK_TICKET_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '591f0378-8b08-4ff3-b75c-255675501191',
  sequence: '119f8cfd-53a6-4aa3-8947-ef90e9a63edc',
  active: '47595264-2e88-4524-bda6-e3582b22ad2b',
  parent: '757606a2-0784-40cc-903d-c943fa270cb9',
  children: '090b9a45-a1be-4862-ade9-439326b7a393',
  completeName: 'e914c1ab-51f6-4875-87ac-9251d7223947',
  helpdeskTickets: 'd18624aa-d453-4e76-ab29-59c75875f49a',
  teamLinks: 'db77c9b8-af88-4eb7-9943-7b91e8270f29',
} as const;

export const HELPDESK_TICKET_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER = '16973d11-4157-4640-82dc-cd7f6c935011';

export const HELPDESK_TICKET_TAG_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'ae60b02c-e13d-48e3-bcbf-bf9b52a6e831',
  color: '004e220d-360b-4237-9504-fa4860f6cd56',
  sequence: '7cd78cee-ffcc-4a3f-abea-aab287cc82a5',
  active: '3bff6658-3712-49d4-b7f5-09e3e6c22540',
  caseLinks: '69b7e115-71a7-44ed-85ff-fb036d0c3652',
} as const;

export const HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER = 'baee1b81-2239-4183-8348-6ee352d04cd4';

export const HELPDESK_TICKET_TEAM_MEMBER_FIELD_UNIVERSAL_IDENTIFIERS = {
  team: 'c3a23d49-f8ed-4c2d-aa6a-7eda489939dc',
  workspaceMember: '36c14270-96c2-4037-ab77-f192f05b9e92',
} as const;

export const HELPDESK_TICKET_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER = '5a5e3c82-10bd-467e-8d76-cf211f4d0dd2';
export const HELPDESK_TICKET_TEAM_MEMBER_INDEX_UNIVERSAL_IDENTIFIER = '619d6ad5-6608-4526-84bc-3652eedbc937';
export const HELPDESK_TICKET_TEAM_MEMBER_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = '2aaf8742-31db-4d2c-b71b-e9f5689f04e8';
export const HELPDESK_TICKET_TEAM_MEMBER_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = '51a0d068-44b8-4430-bd05-4f250b358aa0';

export const HELPDESK_TICKET_TEAM_CATEGORY_FIELD_UNIVERSAL_IDENTIFIERS = {
  team: '3543fe49-a1d2-4231-bb41-ea406aa289ca',
  category: 'bd671aad-be9f-4047-9875-398354126c29',
} as const;

export const HELPDESK_TICKET_TEAM_CATEGORY_OBJECT_UNIVERSAL_IDENTIFIER = 'cf7fb60a-939a-45da-ac89-a90d2a3a7889';
export const HELPDESK_TICKET_TEAM_CATEGORY_INDEX_UNIVERSAL_IDENTIFIER = '761ee379-0005-4330-afed-193cf62c3147';
export const HELPDESK_TICKET_TEAM_CATEGORY_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = 'e0873bfe-4e72-46e1-8fc6-8467698a32fb';
export const HELPDESK_TICKET_TEAM_CATEGORY_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = '202ec263-f38a-4d64-9820-9229a45eaa7b';

export const HELPDESK_TICKET_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS = {
  stage: 'b87bfd7b-e733-4f26-9c93-896ac0d28b95',
  team: '373dd8f1-9dba-4ed2-8150-ec430d8ed5ff',
} as const;

export const HELPDESK_TICKET_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER = '937c6492-800e-4a99-8d21-7c39ecc4a5ed';
export const HELPDESK_TICKET_STAGE_TEAM_INDEX_UNIVERSAL_IDENTIFIER = '72ed05a8-2358-4440-8746-fbe5c5b45313';
export const HELPDESK_TICKET_STAGE_TEAM_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = 'ab57251b-e8da-4d93-81d4-283fe9a26cc9';
export const HELPDESK_TICKET_STAGE_TEAM_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = '250dbbeb-ec28-47e3-ac3f-1bb3e72957d3';

export const HELPDESK_TICKET_TAG_REL_FIELD_UNIVERSAL_IDENTIFIERS = {
  ticket: 'a1c4e0a8-7d9f-4de3-b671-9dcf6e3d2370',
  tag: 'a522f43b-b392-403e-aad1-8990f0c311d5',
} as const;

export const HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER = '1df68a73-d2c8-47c0-873f-e043e0f8462e';
export const HELPDESK_TICKET_TAG_REL_INDEX_UNIVERSAL_IDENTIFIER = '45e909ab-63bf-4255-b1f6-1f04fea500f7';
export const HELPDESK_TICKET_TAG_REL_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = '86ab0595-c58f-45e8-8f9a-036c42690232';
export const HELPDESK_TICKET_TAG_REL_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = '5a448bc5-0696-43f4-a044-3fdf4bf7317e';

export const HELPDESK_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  workspaceMemberHelpdeskTickets: '9c8ba87a-91f2-4740-bed2-5b75c3fda439',
  personHelpdeskTickets: '6b0fd484-d493-4dcf-a7f1-470bf0964871',
  companyHelpdeskTickets: '7c52b6f6-7ef1-4a29-8069-2902c9d6ef66',
  workspaceMemberHelpdeskTeamsLed: '41e035b3-97d9-4d3b-a620-293e2ad1b1a7',
  workspaceMemberHelpdeskTeamMembers: '1053ebad-3e0a-4aa9-aeae-2765a1542371',
} as const;

export const HELPDESK_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  helpdeskTicket: '61f1530c-60e8-4090-85fb-9ec6786870a4',
  helpdeskTicketTeam: '330f2005-9703-4fbf-a782-16bc1b314442',
  helpdeskTicketStage: '474f88fa-a71c-4b43-8aab-0116f5f88fb8',
  helpdeskTicketCategory: '29d69ec4-be24-4388-bc57-3b2066d460a5',
  helpdeskTicketTag: '43545620-c34f-42b3-aaa1-f098a0da3c60',
  helpdeskTicketTeamMember: '7959a755-e418-44c5-87e9-612a96db0ce0',
  helpdeskTicketTeamCategory: '8e7f5136-8249-4f57-a98e-79a1fa15a3dc',
  helpdeskTicketStageTeam: 'ad40de25-c0c4-402b-b813-b6056bc44d4b',
  helpdeskTicketTagRel: '9ef5271f-fa02-4f2d-bf2d-2691af8802e2',
  person: '152da9f8-8bf0-48e9-929e-14857da7fd1e',
  company: 'c0f3f83d-a232-4c5d-ada2-ebecbde7bf10',
  workspaceMember: 'ed268680-ebde-44fe-9723-8086e305e7df',
} as const;

export const HELPDESK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIERS = {
  folder: '970df802-dd8b-41f2-852a-e4f9f12cb13a',
  cases: 'd4562563-677a-41e8-a012-1902f5488ce4',
  teams: '28271ecd-9be5-49d5-bfa7-4751172895a5',
  stages: 'fec9b74b-cf53-4faa-9b73-e80709647a18',
  categories: '013b142d-72e1-4fa4-8ecc-be4c011cf0e3',
  tags: '2bfaa9de-9989-4ed7-9ab6-79d15c2ae89d',
} as const;
