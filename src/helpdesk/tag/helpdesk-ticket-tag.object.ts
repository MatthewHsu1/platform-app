import { defineObject } from 'twenty-sdk/define';

import {
  HELPDESK_TICKET_TAG_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_TAG_REL_FIELD_UNIVERSAL_IDENTIFIERS as TAG_REL_IDS,
  HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { activeField, numberField, oneToManyField, textField } from 'src/shared/fields';

// Tags are a table of their own, not a staff list, because service level policies link to them.
export default defineObject({
  universalIdentifier: HELPDESK_TICKET_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'helpdeskTicketTag',
  namePlural: 'helpdeskTicketTags',
  labelSingular: 'Work case tag',
  labelPlural: 'Work case tags',
  description: 'A label staff put on work cases',
  icon: 'IconTag',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.name,
  fields: [
    textField(FIELD_IDS.name, 'name', 'Name', 'IconAbc'),
    textField(FIELD_IDS.color, 'color', 'Color', 'IconPalette'),
    numberField(FIELD_IDS.sequence, 'sequence', 'Sequence', 'IconArrowsSort', { decimals: 0, int: true, defaultValue: 10 }),
    activeField(FIELD_IDS.active),
    oneToManyField({
      universalIdentifier: FIELD_IDS.caseLinks,
      name: 'caseLinks',
      label: 'Cases',
      icon: 'IconLifebuoy',
      targetObjectUniversalIdentifier: HELPDESK_TICKET_TAG_REL_OBJECT_UNIVERSAL_IDENTIFIER,
      targetFieldUniversalIdentifier: TAG_REL_IDS.tag,
      junctionTargetFieldUniversalIdentifier: TAG_REL_IDS.ticket,
    }),
  ],
});
