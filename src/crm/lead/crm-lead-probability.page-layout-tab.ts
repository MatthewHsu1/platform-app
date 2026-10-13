import { definePageLayoutTab } from 'twenty-sdk/define';

import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { CRM_SCREEN_IDS as IDS } from 'src/crm/screens-universal-identifiers.constant';
import { SCORING_TOOLTIP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/crm/scoring/scoring-universal-identifiers.constant';
import { frontComponentWidget, recordPageTab } from 'src/shared/page-layout/widgets';

export default definePageLayoutTab(
  recordPageTab({
    universalIdentifier: IDS.leadTabProbability,
    objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER,
    title: 'Probability',
    position: 11,
    icon: 'IconPercentage',
    widgets: [frontComponentWidget(IDS.leadWidgetProbability, 'Probability', SCORING_TOOLTIP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER)],
  }),
);
