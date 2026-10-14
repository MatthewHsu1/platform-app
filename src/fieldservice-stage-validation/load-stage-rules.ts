import { fsmStageRules } from 'src/fieldservice-stage-validation/fieldservice-stage-validation-records';
import { type StageRuleRow } from 'src/fieldservice-stage-validation/types/stage-rule-row.type';

// The rule rows of these stages. Read with the app role, which the server lets read every row.
export const loadStageRules = (stages: string[]) => fsmStageRules.find<StageRuleRow>({ stage: { in: stages } }, 'stage requiredFields');
