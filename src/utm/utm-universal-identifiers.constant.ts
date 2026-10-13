export const UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER =
  'c6da483e-8ea7-4711-a6c3-4a614deb1722';
export const UTM_SOURCE_FIELD_UNIVERSAL_IDENTIFIERS = {
  active: '6dd95d09-0701-4295-bf69-8ba0ddca6d31',
  crmLeads: '20455627-0ea7-40e2-bf61-573c95d7ebcd',
  seedKey: '881535fa-bde7-4044-bdb5-9f365a66fd3e',
} as const;
export const UTM_SOURCES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  'ff09f241-9ec7-49a0-94f7-c24672ca1675';

export const UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER =
  '45980c19-4044-4244-99c9-5ebe76585733';
export const UTM_MEDIUM_FIELD_UNIVERSAL_IDENTIFIERS = {
  active: '6b1707cc-d176-4f0a-9fc8-ec41b8737b98',
  crmLeads: '1438460e-0a66-4e38-83b0-ec5f635e79ff',
  seedKey: 'df301010-5cc6-4e1e-bd7a-f39ae789d68a',
} as const;
export const UTM_MEDIUMS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  'e07296be-4a26-41f8-aca0-946b10e109fc';

export const UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER =
  'c3e1bf39-4372-4552-bb38-832c3cf17f8e';
export const UTM_CAMPAIGN_FIELD_UNIVERSAL_IDENTIFIERS = {
  active: '47e74513-8474-4f0c-ae0a-3f015df203d9',
  crmLeads: '14f25c7d-ba4b-4f5f-a068-18a35b5e3ab4',
  responsible: '9e8d019d-b23a-4178-98bc-a14446630a11',
  stage: '1edb8cbf-c7c9-486b-b399-b6b660e270cf',
  tags: '39879fa1-ddfd-4852-b25f-b13a9ca4c000',
  isAutoCampaign: '35d418a5-80c2-47b5-bad3-cba84d79e497',
  color: '594f0a36-2fae-4bcd-9a93-4bdc5a89d852',
} as const;
export const UTM_CAMPAIGNS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER =
  'b46c586d-38de-4392-bf51-251fef8383d4';

export const UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER = '1eec98e7-b3b7-4070-a726-1bc9323f9bb3';
export const UTM_STAGE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '66b8d98c-9222-426d-928d-bd979d466807',
  sequence: '7b919004-ce7f-4669-bae5-c999bcbc5d4d',
  campaigns: 'ecb01f99-80a4-4dcc-80f7-29f880980a9e',
  seedKey: 'bd9ffeaa-dd0d-4a04-a94f-7267f542311d',
} as const;
export const UTM_STAGES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER = '9d893a98-3b03-461c-af97-4b2e902689d4';

export const UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER = '5d73d4f4-52e5-4d76-83c4-3dc6a2b7b057';
export const UTM_TAG_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: 'd0ddd4d6-a8cf-49ba-90e0-2caa7d567729',
  color: 'a3dd72d9-7dd2-460b-a78b-7d1d8790e9e7',
  campaignLinks: '48840d6e-600f-4631-9479-9e5decb1c6d3',
  seedKey: 'b6aef439-4fbc-454b-bdef-5d7685e165d9',
} as const;
export const UTM_TAG_NAME_INDEX_UNIVERSAL_IDENTIFIER = '2f59fb1d-8317-432d-a0b1-9c3e92cf3551';
export const UTM_TAG_NAME_INDEX_FIELD_UNIVERSAL_IDENTIFIER = '85f8d0be-98f1-4a5f-8c77-1e704a2d878f';
export const UTM_TAGS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER = 'a1693558-c816-4e7c-8297-4e8f632bd9ba';

export const UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER = '11f077dd-8227-44b1-bd0c-58526f166d19';
export const UTM_CAMPAIGN_TAG_FIELD_UNIVERSAL_IDENTIFIERS = {
  campaign: 'c8a5e1a9-0abe-4969-8a2f-e65c5d5bb422',
  tag: '6d1445ed-eadf-49a8-8faa-f9d42a08324d',
} as const;
export const UTM_CAMPAIGN_TAG_PAIR_INDEX_UNIVERSAL_IDENTIFIER = 'e55f3323-2d5d-4e14-8bd2-bd52490e49d7';
export const UTM_CAMPAIGN_TAG_PAIR_INDEX_FIRST_FIELD_UNIVERSAL_IDENTIFIER = '95195b64-af78-4b1c-add5-b3af02c91343';
export const UTM_CAMPAIGN_TAG_PAIR_INDEX_SECOND_FIELD_UNIVERSAL_IDENTIFIER = 'dbe49ec8-14c5-47ff-9c38-e84549ef638c';

export const UTM_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS = {
  workspaceMemberUtmCampaigns: '407ec242-688f-4925-b791-9633c55f6d16',
} as const;

export const UTM_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  utmCampaign: 'aceb1c07-5f9c-4491-9ad5-984fd221daf0',
  utmSource: '281ac23e-a813-4ea2-905e-569708cd63f2',
  utmMedium: '8d57ea64-f66f-4bc5-aae2-f7a028214e02',
  utmStage: 'afa6fd08-974f-4c7c-8fca-170aab77da2f',
  utmTag: '030378c0-911a-46b1-8032-af043ad15d69',
  utmCampaignTag: '6ce0ddca-03d3-4edf-866e-2f530ffdf5b6',
} as const;

export const UTM_SEED_KEYS = {
  defaultStage: 'utm.default_utm_stage',
  marketingTag: 'utm.utm_tag_1',
  referralSource: 'utm.utm_source_referral',
} as const;

// Default sources and mediums by key, in the order of the default rows.
export const UTM_SOURCE_SEEDS = [
  { seedKey: 'utm.utm_source_search_engine', name: 'Search engine' },
  { seedKey: 'utm.utm_source_mailing', name: 'Lead Recall' },
  { seedKey: 'utm.utm_source_newsletter', name: 'Newsletter' },
  { seedKey: 'utm.utm_source_facebook', name: 'Facebook' },
  { seedKey: 'utm.utm_source_twitter', name: 'X' },
  { seedKey: 'utm.utm_source_linkedin', name: 'LinkedIn' },
  { seedKey: 'utm.utm_source_monster', name: 'Monster' },
  { seedKey: 'utm.utm_source_glassdoor', name: 'Glassdoor' },
  { seedKey: 'utm.utm_source_craigslist', name: 'Craigslist' },
  { seedKey: 'utm.utm_source_referral', name: 'Referral' },
] as const;

export const UTM_MEDIUM_SEEDS = [
  { seedKey: 'utm.utm_medium_website', name: 'Website' },
  { seedKey: 'utm.utm_medium_phone', name: 'Phone' },
  { seedKey: 'utm.utm_medium_direct', name: 'Direct' },
  { seedKey: 'utm.utm_medium_email', name: 'Email' },
  { seedKey: 'utm.utm_medium_banner', name: 'Banner' },
  { seedKey: 'utm.utm_medium_twitter', name: 'X' },
  { seedKey: 'utm.utm_medium_facebook', name: 'Facebook' },
  { seedKey: 'utm.utm_medium_linkedin', name: 'LinkedIn' },
  { seedKey: 'utm.utm_medium_television', name: 'Television' },
  { seedKey: 'utm.utm_medium_google_adwords', name: 'Google Adwords' },
] as const;

// Mediums other parts of the system rely on; their delete is refused.
export const PROTECTED_MEDIUM_SEED_KEYS: readonly string[] = [
  'utm.utm_medium_email',
  'utm.utm_medium_direct',
  'utm.utm_medium_website',
  'utm.utm_medium_twitter',
  'utm.utm_medium_facebook',
  'utm.utm_medium_linkedin',
];
