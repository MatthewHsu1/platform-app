import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  PUSH_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  STOCK_RULE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  STOCK_RULE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as LAYOUT_IDS,
} from 'src/stock/routing-universal-identifiers.constant';

const GENERAL_FIELDS = [
  ['name', 'Name'],
  ['action', 'Action'],
  ['locationSrc', 'Source Location'],
  ['locationDest', 'Destination Location'],
  ['pickingType', 'Operation Type'],
  ['procureMethod', 'Supply Method'],
  ['auto', 'Automatic Move'],
  ['route', 'Route'],
  ['warehouse', 'Warehouse'],
  ['sequence', 'Sequence'],
  ['delay', 'Lead Time'],
  ['locationDestFromRule', 'Destination location origin from rule'],
  ['partnerAddress', 'Partner Address (company)'],
  ['partnerAddressPerson', 'Partner Address (person)'],
  ['propagateCancel', 'Cancel Next Move'],
  ['propagateCarrier', 'Propagation of carrier'],
  ['active', 'Active'],
  ['ruleMessage', 'Explanation'],
] as const;

// A custom layout replaces Twenty's default record page, so the last two tabs
// bring back its timeline and notes.
export default definePageLayout({
  universalIdentifier: LAYOUT_IDS.layout,
  name: 'Stock rule page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: STOCK_RULE_OBJECT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: LAYOUT_IDS.tabGeneral,
      title: 'General',
      position: 10,
      icon: 'IconInfoCircle',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: GENERAL_FIELDS.map(([field, title]) => ({
        universalIdentifier: LAYOUT_IDS.generalWidgets[field],
        title,
        type: 'FIELD' as const,
        configuration: { configurationType: 'FIELD' as const, fieldMetadataId: FIELD_IDS[field], fieldDisplayMode: 'FIELD' as const },
      })),
    },
    {
      universalIdentifier: LAYOUT_IDS.tabPushFilter,
      title: 'Push filter',
      position: 20,
      icon: 'IconFilter',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: LAYOUT_IDS.widgetPushFilter,
          title: 'Push filter',
          type: 'FRONT_COMPONENT',
          configuration: { configurationType: 'FRONT_COMPONENT', frontComponentUniversalIdentifier: PUSH_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER },
        },
      ],
    },
    {
      universalIdentifier: LAYOUT_IDS.tabTimeline,
      title: 'Timeline',
      position: 30,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [{ universalIdentifier: LAYOUT_IDS.widgetTimeline, title: 'Timeline', type: 'TIMELINE', configuration: { configurationType: 'TIMELINE' } }],
    },
    {
      universalIdentifier: LAYOUT_IDS.tabNotes,
      title: 'Notes',
      position: 40,
      icon: 'IconNotes',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [{ universalIdentifier: LAYOUT_IDS.widgetNotes, title: 'Notes', type: 'NOTES', configuration: { configurationType: 'NOTES' } }],
    },
  ],
});
