import { MOVE_STATE, MOVE_TYPE } from 'src/stock/stock-options.constant';
import { planPickingState } from 'src/stock/utils/plan-picking-state.util';
import { type LocationUsage } from 'src/stock/types/location-usage.type';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type MoveType } from 'src/stock/types/move-type.type';
import { type PickingState } from 'src/stock/types/picking-state.type';
import { type StateMove } from 'src/stock/utils/types/state-move.type';

const time = (value: string) => Date.parse(value);

const earliest = (values: string[]) =>
  values.reduce<string | null>((best, value) => (best === null || time(value) < time(best) ? value : best), null);

const latest = (values: string[]) =>
  values.reduce<string | null>((best, value) => (best === null || time(value) > time(best) ? value : best), null);

const present = (values: (string | null)[]) => values.flatMap((value) => (value === null ? [] : [value]));

const isLive = (state: MoveState) => state !== MOVE_STATE.DONE && state !== MOVE_STATE.CANCEL;

export const planScheduledDate = ({
  moveType,
  moves,
  current,
  now,
}: {
  moveType: MoveType;
  moves: { state: MoveState; date: string | null }[];
  current: string | null;
  now: string;
}) => {
  const dates = present(moves.filter((move) => isLive(move.state)).map((move) => move.date));
  const picked = moveType === MOVE_TYPE.DIRECT ? earliest(dates) : latest(dates);

  return picked ?? current ?? now;
};

export const planDateDeadline = ({
  moveType,
  moves,
}: {
  moveType: MoveType;
  moves: { state: MoveState; dateDeadline: string | null }[];
}) => {
  const deadlines = present(moves.filter((move) => move.state !== MOVE_STATE.CANCEL).map((move) => move.dateDeadline));

  return moveType === MOVE_TYPE.DIRECT ? earliest(deadlines) : latest(deadlines);
};

export const planHasDeadlineIssue = ({
  dateDeadline,
  scheduledDate,
}: {
  dateDeadline: string | null;
  scheduledDate: string;
}) => dateDeadline !== null && time(dateDeadline) < time(scheduledDate);

export const planPickingDelayAlertDate = (moves: { delayAlertDate: string | null }[]) =>
  latest(present(moves.map((move) => move.delayAlertDate)));

type PickingValues = {
  state: PickingState;
  scheduledDate: string;
  dateDeadline: string | null;
  hasDeadlineIssue: boolean;
  delayAlertDate: string | null;
};

export const planPickingValues = ({
  picking,
  locationUsage,
  moves,
  now,
}: {
  picking: { moveType: MoveType; state: PickingState; scheduledDate: string | null };
  locationUsage: LocationUsage | null;
  moves: (StateMove & { date: string | null; dateDeadline: string | null; delayAlertDate: string | null })[];
  now: string;
}): PickingValues => {
  const scheduledDate = planScheduledDate({ moveType: picking.moveType, moves, current: picking.scheduledDate, now });
  const dateDeadline = planDateDeadline({ moveType: picking.moveType, moves });

  return {
    state: planPickingState({ moveType: picking.moveType, locationUsage, currentState: picking.state, moves }),
    scheduledDate,
    dateDeadline,
    hasDeadlineIssue: planHasDeadlineIssue({ dateDeadline, scheduledDate }),
    delayAlertDate: planPickingDelayAlertDate(moves),
  };
};
