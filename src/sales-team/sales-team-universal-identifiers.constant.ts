export const CRM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '6df039c4-4f33-4d70-991c-5297f5838a73',
  sequence: '8894a048-e0e9-47fd-929a-a01a5ad22cce',
  active: '749f9dd7-db99-4c99-8a4f-9b48dd50428b',
  leader: '9bdd5a3d-7f15-457e-b2b5-d34de2d073ad',
  useLeads: '31cf4e74-e999-4148-92ba-c310d5521d55',
  useOpportunities: 'fcb50ef2-cf19-44e8-abef-7faa8c3f8a40',
  assignmentOptout: '33519062-3ef8-4d38-9f51-456545eae9c4',
  assignmentDomain: '9a94d09b-87b8-4725-b76a-49772e6ec35b',
  assignmentMax: 'fe640cca-78ff-4ace-9fc5-042bcfcea35e',
  color: '9249a7c4-a550-40da-82a3-b324a8a532ca',
  members: 'd751a28b-4422-472f-8a23-8e4341002fc1',
  stageLinks: '833110c9-4167-4c46-9b6f-f916dbb5884e',
  seedKey: '57ba80ff-15c2-420b-af9e-4bf51ec15f46',
} as const;

export const CRM_TEAM_MEMBER_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '3a38ae6f-cea7-4c88-80f4-8e50572a4a05',
  crmTeam: '3c901ed0-0c80-4c39-b274-b1ff3ca2ccef',
  user: 'b4818f65-a740-4a30-be5b-c7d03f3821f6',
  active: '2cca101c-f14c-45bc-bd02-10db09083b1d',
  assignmentMax: '2194faf3-a69c-4ceb-b677-12e8ef37de7b',
  assignmentOptout: '739ec29e-110b-437f-8290-8f218ea5b99f',
  assignmentDomain: '267a8c78-36da-414f-857a-42f6bbb53f82',
  assignmentDomainPreferred: 'cda2c77e-e684-4eb2-aac6-06ff4e2f67d6',
} as const;

export const CRM_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS = {
  stage: '750e64db-9b1b-4a43-a632-9ca1a2a913ab',
  team: '84063a9c-9b4f-4a47-9c2c-45c599b33caf',
} as const;

export const SALES_TEAM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  workspaceMemberCrmTeamsLed: '99da7db6-23c8-4328-b656-33384eaf4865',
  workspaceMemberCrmTeamMembers: 'df292016-b9e0-49f9-9561-b0eb6f76b1e9',
  crmLeadTeam: '0cc7a930-d05d-487c-be4d-90e5bd073a6f',
  crmTeamCrmLeads: '369a8076-b34c-457c-9080-38a35c0a8a51',
} as const;

export const SALES_TEAM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  crmTeam: '90f6f65f-033a-45b1-b5db-4597d1c50ce6',
  crmTeamMember: '96cfa9e4-157c-444b-908d-e138e40178ed',
  crmStageTeam: '0a33c0b2-9ed5-4fa8-ae2d-20f5354bd03a',
  person: 'be5816d1-41b3-4c9f-80e2-91560985e950',
  company: '5ecdc3d8-9abc-4345-8d34-616231d09c1c',
  workspaceMember: 'f4644f1e-d4a7-4129-b396-3ecad082db31',
} as const;

export const CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER = '2493c2dd-3456-4edf-b684-ab0644ac2ec5';
export const CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER = 'a57b35db-f3f7-40e2-a6ba-184be54cb86b';
export const CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER = '82af1fba-1c5e-4847-bf43-fd3a379d1889';
export const CRM_STAGE_TEAM_PAIR_INDEX_UNIVERSAL_IDENTIFIER = '5c6a47a0-c33e-4f6e-874e-bf9c049aff47';
export const CRM_STAGE_TEAM_PAIR_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = '6abf1a4b-adbc-45ca-8e67-979296066bbc';
export const CRM_STAGE_TEAM_PAIR_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = '1f5c2259-896a-48b3-8742-2afd94a57812';
export const CRM_TEAMS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER = '22120471-a0c3-4fa5-a87e-e05967cba972';

// Rows the install step makes once; code finds them by key after staff rename them.
export const SALES_TEAM_SEED_KEYS = {
  sales: 'sales_team.team_sales_department',
  website: 'sales_team.salesteam_website_sales',
  pointOfSale: 'sales_team.pos_sales_team',
} as const;

// A default team that cannot be deleted; it can stay archived.
export const PROTECTED_TEAM_SEED_KEYS: readonly string[] = [SALES_TEAM_SEED_KEYS.website, SALES_TEAM_SEED_KEYS.pointOfSale];
