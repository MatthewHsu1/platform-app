import { IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/base/base-universal-identifiers.constant';
import { type ModuleInstallSpec } from 'src/shared/install/install-spec.type';

export const BASE_INSTALL: ModuleInstallSpec = {
  firstVersion: '2.3.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [],
  boards: [],
  validationRules: [
    {
      objectUniversalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-sequence-step-not-zero',
      expression: 'numberIncrement != 0',
      message: 'The step of a sequence cannot be 0.',
    },
    {
      objectUniversalIdentifier: IR_SEQUENCE_OBJECT_UNIVERSAL_IDENTIFIER,
      name: 'platform-sequence-name-required',
      expression: 'isNonEmptyString(name)',
      message: 'Name is required.',
    },
  ],
};
