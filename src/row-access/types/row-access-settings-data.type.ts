import { type RowAccessConfig } from 'src/row-access/types/row-access-config.type';
import { type OwnerCandidateObject } from 'src/row-access/types/owner-candidate-object.type';
import { type RuleObject } from 'src/row-access/types/rule-object.type';
import { type MetadataRole } from 'src/row-access/types/metadata-role.type';

export type RowAccessSettingsData = {
  applicationId: string;
  savedConfig: RowAccessConfig;
  savedConfigProblem: string | undefined;
  candidateObjects: OwnerCandidateObject[];
  ruleObjects: RuleObject[];
  roles: MetadataRole[];
};
