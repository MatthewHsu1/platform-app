import { IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base/base-universal-identifiers.constant';
import { CASE_SEQUENCE_CODE, CHANNEL_OPTIONS, HELPDESK_SEED_KEYS } from 'src/helpdesk/helpdesk-options.constant';
import {
  HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
  HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/helpdesk/helpdesk-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

const stageSeed = (seedKey: string, sequence: number, name: string, flags: { unattended?: boolean; closed?: boolean; fold?: boolean }) => ({
  seedKey,
  values: { name, sequence, active: true, unattended: flags.unattended ?? false, closed: flags.closed ?? false, fold: flags.fold ?? false },
});

// The case number series, the six first stages and the channel list, made once when the module first
// arrives. Titles, descriptions and names have no required rule: Twenty saves a new row before
// its name is typed, so such a rule refuses every new case, team and stage.
export const HELPDESK_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.5.0',
  staffLists: [
    {
      objectUniversalIdentifier: HELPDESK_TICKET_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'channel',
      label: 'Channel',
      icon: 'IconPhoneCall',
      type: 'SELECT',
      options: CHANNEL_OPTIONS,
    },
  ],
  defaultRows: [],
  seedRows: [
    {
      objectUniversalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        {
          seedKey: HELPDESK_SEED_KEYS.sequence,
          values: { name: 'Work case number', code: CASE_SEQUENCE_CODE, prefix: 'HT', padding: 5, numberNext: 1, numberIncrement: 1, active: true },
        },
      ],
    },
    {
      objectUniversalIdentifier: HELPDESK_TICKET_STAGE_OBJECT_UNIVERSAL_IDENTIFIER,
      rows: [
        stageSeed(HELPDESK_SEED_KEYS.stageNew, 1, 'New', { unattended: true }),
        stageSeed(HELPDESK_SEED_KEYS.stageInProgress, 2, 'In Progress', {}),
        stageSeed(HELPDESK_SEED_KEYS.stageAwaiting, 3, 'Awaiting', {}),
        stageSeed(HELPDESK_SEED_KEYS.stageDone, 4, 'Done', { closed: true, fold: true }),
        stageSeed(HELPDESK_SEED_KEYS.stageCancelled, 5, 'Cancelled', { closed: true, fold: true }),
        stageSeed(HELPDESK_SEED_KEYS.stageRejected, 6, 'Rejected', { closed: true, fold: true }),
      ],
    },
  ],
  boards: [],
  validationRules: [],
};
