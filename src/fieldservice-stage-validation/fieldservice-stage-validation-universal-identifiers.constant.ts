// Universal ids of the module that lists the fields an order needs before it moves into a stage. New ids are
// random UUID v4 and never change after release.

export const FSM_STAGE_RULE_OBJECT_UNIVERSAL_IDENTIFIER = '1c42a267-d11c-4405-82a2-14974ad2cfa4';

export const FSM_STAGE_RULE_FIELD_UNIVERSAL_IDENTIFIERS = {
  name: '28e6f8f4-d322-4991-8fcc-e3d72b6f15cf',
  requiredFields: '30a6c780-c44c-4745-a767-af770cc457ab',
  otherFields: '9f771af5-a922-49a9-8f5e-3be368918c8a',
} as const;

export const FIELDSERVICE_STAGE_VALIDATION_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER = 'c4425034-8132-43cf-869c-31a7cf9b5c19';

export const FIELDSERVICE_STAGE_VALIDATION_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIERS = {
  order: '76d8bcf1-5b81-4ef9-8114-07305d96dbe6',
  stageRule: '9ab16286-7a62-4bbe-a405-f10d585354b4',
} as const;
