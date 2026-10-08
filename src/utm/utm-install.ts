import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';
import {
  UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

// Default sources and mediums. There are no default campaigns.
export const UTM_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.0.0',
  staffLists: [],
  defaultRows: [
    {
      objectUniversalIdentifier: UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
      names: [
        'Search engine',
        'Lead Recall',
        'Newsletter',
        'Facebook',
        'X',
        'LinkedIn',
        'Monster',
        'Glassdoor',
        'Craigslist',
        'Referral',
      ],
    },
    {
      objectUniversalIdentifier: UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER,
      names: [
        'Website',
        'Phone',
        'Direct',
        'Email',
        'Banner',
        'X',
        'Facebook',
        'LinkedIn',
        'Television',
        'Google Adwords',
      ],
    },
  ],
  seedRows: [],
  boards: [],
  validationRules: [],
};
