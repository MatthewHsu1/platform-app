import { type StageRow } from 'src/crm/lead/types/stage-row.type';

export const WON_STAGE_REFUSAL_MESSAGE =
  'A lead in a won stage must stay at 100 %. To mark it lost, move it to another stage first.';

export const planWonStageRefusal = ({
  stage,
  probability,
  written,
}: {
  stage: StageRow | null;
  probability: number | null;
  written: ReadonlySet<string>;
}) => stage?.isWon === true && probability !== 100 && (written.has('stageId') || written.has('probability'));
