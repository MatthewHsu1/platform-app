import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';
import {
  UTM_MEDIUM_OBJECT_UNIVERSAL_IDENTIFIER,
  UTM_SOURCE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/utm/utm-universal-identifiers.constant';

// Default rows from the reference ERP utm/data/utm_source_data.xml and
// utm_medium_data.xml. the reference ships no default campaigns.
export const UTM_INSTALL: ModuleInstallSpec = {
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
  boards: [],
};
