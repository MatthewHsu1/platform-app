import {
  CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_RECURRING_PLAN_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/crm/crm-universal-identifiers.constant';
import { CRM_LEAD_SCORING_FREQUENCY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/scoring/scoring-universal-identifiers.constant';
import { type Rights } from 'src/roles/types/rights.type';
import { type SalesRoleRow } from 'src/roles/types/sales-role-row.type';
import {
  CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/sales-team/sales-team-universal-identifiers.constant';
import {
  UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

const row = (objectUniversalIdentifier: string, ownDocuments: Rights, allDocuments: Rights, administrator: Rights): SalesRoleRow => ({
  objectUniversalIdentifier,
  ownDocuments,
  allDocuments,
  administrator,
});

// Columns: Sales: Own Documents, Sales: All Documents, Sales: Administrator. Which leads a block
// reads is its row rule, not a right here.
export const SALES_ROLE_TABLE: SalesRoleRow[] = [
  row(CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RUD'),
  row(CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(CRM_TEAM_MEMBER_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(CRM_LOST_REASON_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  row(CRM_RECURRING_PLAN_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'RUD'),
  // Only the app writes the scoring counts.
  row(CRM_LEAD_SCORING_FREQUENCY_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'R'),
  row(UTM_CAMPAIGN_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RUD'),
  row(UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RUD'),
  row(UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER, 'RU', 'RU', 'RUD'),
  // Untagging a campaign removes a link row: whoever edits a campaign needs it.
  row(UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER, 'RUD', 'RUD', 'RUD'),
  // Only Twenty's Admin role changes stages and tags.
  row(UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'R'),
  row(UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER, 'R', 'R', 'R'),
];
