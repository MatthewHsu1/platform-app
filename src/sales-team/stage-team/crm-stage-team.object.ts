import { defineObject, OnDeleteAction } from 'twenty-sdk/define';

import { CRM_STAGE_FIELD_UNIVERSAL_IDENTIFIERS, CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { manyToOneField } from 'src/shared/fields';
import {
  CRM_STAGE_TEAM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  CRM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS,
  CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/sales-team/sales-team-universal-identifiers.constant';

// Limits a stage to some teams. Deleting the stage removes its links; a team
// named by a stage cannot be deleted until it is taken off the stage.
export default defineObject({
  universalIdentifier: CRM_STAGE_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'crmStageTeam',
  namePlural: 'crmStageTeams',
  labelSingular: 'Stage team link',
  labelPlural: 'Stage team links',
  description: 'Limits a pipeline stage to a sales team',
  icon: 'IconLink',
  fields: [
    manyToOneField({
      universalIdentifier: FIELD_IDS.stage,
      name: 'stage',
      label: 'Stage',
      icon: 'IconProgress',
      onDelete: OnDeleteAction.CASCADE,
      targetObjectUniversalIdentifier: CRM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_STAGE_FIELD_UNIVERSAL_IDENTIFIERS.teams,
    }),
    manyToOneField({
      universalIdentifier: FIELD_IDS.team,
      name: 'team',
      label: 'Sales team',
      icon: 'IconUsers',
      onDelete: OnDeleteAction.RESTRICT,
      targetObjectUniversalIdentifier: CRM_TEAM_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: CRM_TEAM_FIELD_UNIVERSAL_IDENTIFIERS.stageLinks,
    }),
  ],
});
