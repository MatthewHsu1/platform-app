import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';
import {
  UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_MEDIUM_SEEDS,
  UTM_SEED_KEYS,
  UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_SOURCE_SEEDS,
  UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

// Default sources and mediums. There are no default campaigns.
export const UTM_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.0.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [
    { objectUniversalIdentifier: UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER, rows: UTM_SOURCE_SEEDS.map(({ seedKey, name }) => ({ seedKey, values: { name } })) },
    { objectUniversalIdentifier: UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER, rows: UTM_MEDIUM_SEEDS.map(({ seedKey, name }) => ({ seedKey, values: { name } })) },
  ],
  boards: [],
  validationRules: [],
};

// The campaign stage and tag defaults, the tag link rule, and keys for the
// default sources and mediums made by name before keys existed. Names get no
// required rule: Twenty saves a new row before its name is typed, so such a
// rule refuses every new row.
export const UTM_STAGE_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.4.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [
    { objectUniversalIdentifier: UTM_STAGE_OBJECT_UNIVERSAL_IDENTIFIER, rows: [{ seedKey: UTM_SEED_KEYS.defaultStage, values: { name: 'New', sequence: 10 } }] },
    { objectUniversalIdentifier: UTM_TAG_OBJECT_UNIVERSAL_IDENTIFIER, rows: [{ seedKey: UTM_SEED_KEYS.marketingTag, values: { name: 'Marketing', color: 'red' } }] },
  ],
  seedKeyBackfills: [
    { objectUniversalIdentifier: UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER, keys: UTM_SOURCE_SEEDS.map(({ seedKey, name }) => ({ seedKey, name })) },
    { objectUniversalIdentifier: UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER, keys: UTM_MEDIUM_SEEDS.map(({ seedKey, name }) => ({ seedKey, name })) },
  ],
  boards: [],
  validationRules: [
    {
      objectUniversalIdentifier: UTM_CAMPAIGN_TAG_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-utm-campaign-tag-both-sides',
      expression: 'isDefined(campaign) and isDefined(tag)',
      message: 'A campaign tag link needs a campaign and a tag.',
    },
  ],
};
