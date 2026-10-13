import { defineObject, FieldType } from 'twenty-sdk/define';

import {
  PLATFORM_CLAIM_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PLATFORM_CLAIM_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/shared/claims/claims-universal-identifiers.constant';
import { appTextField, appWritten } from 'src/shared/fields';

// One row per run that must not happen twice at once: the unique key stops a
// second run on the same record until the first finishes or goes stale.
export default defineObject({
  universalIdentifier: PLATFORM_CLAIM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'platformClaim',
  namePlural: 'platformClaims',
  labelSingular: 'Claim',
  labelPlural: 'Claims',
  description: 'A run in progress on a record, so a second run waits',
  icon: 'IconLock',
  labelIdentifierFieldMetadataUniversalIdentifier: FIELD_IDS.key,
  fields: [
    appTextField(FIELD_IDS.key, 'key', 'Key', 'IconKey'),
    appTextField(FIELD_IDS.runId, 'runId', 'Run', 'IconPlayerPlay'),
    appWritten({ universalIdentifier: FIELD_IDS.startedAt, name: 'startedAt', label: 'Started at', icon: 'IconClock', type: FieldType.DATE_TIME }),
    appWritten({ universalIdentifier: FIELD_IDS.finishedAt, name: 'finishedAt', label: 'Finished at', icon: 'IconClockCheck', type: FieldType.DATE_TIME }),
    appWritten({ universalIdentifier: FIELD_IDS.progress, name: 'progress', label: 'Progress', icon: 'IconListCheck', type: FieldType.RAW_JSON }),
  ],
});
