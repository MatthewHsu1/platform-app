import { type UtmNameRules } from 'src/utm/types/utm-name-rules.type';
import { UTM_MESSAGES } from 'src/utm/utm-messages';
import { PROTECTED_MEDIUM_SEED_KEYS, UTM_SEED_KEYS } from 'src/utm/utm-universal-identifiers.constant';

// Sources are counted whether archived or not.
export const SOURCE_NAME_RULES: UtmNameRules = {
  object: 'utmSource',
  leadField: 'sourceId',
  archivedHoldNames: false,
  protectedSeedKeys: [UTM_SEED_KEYS.referralSource],
  protectedMessage: UTM_MESSAGES.referralSource,
};

// Only active mediums count for the counter, but an archived medium keeps its
// name: a new medium that would take it is refused.
export const MEDIUM_NAME_RULES: UtmNameRules = {
  object: 'utmMedium',
  leadField: 'mediumId',
  archivedHoldNames: true,
  protectedSeedKeys: PROTECTED_MEDIUM_SEED_KEYS,
  protectedMessage: UTM_MESSAGES.protectedMedium,
};
