import { type SkippedField } from 'src/fieldservice-stage-validation/types/skipped-field.type';
import { type StageRuleField } from 'src/fieldservice-stage-validation/types/stage-rule-field.type';

export type RequiredFields = { fields: StageRuleField[]; skipped: SkippedField[] };
