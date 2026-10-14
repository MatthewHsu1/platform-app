import { CLOSED_STATUS } from 'src/fieldservice/fieldservice-options.constant';
import { fsmOrders, fsmTeams } from 'src/fieldservice/fieldservice-records';
import { teamCounts } from 'src/fieldservice/utils/team-counts.util';
import { findMany } from 'src/shared/triggers/records';

type TeamCountRow = { id: string; orderCount: number | null; orderNeedAssignCount: number | null; orderNeedScheduleCount: number | null };

type CountedOrder = { teamId: string | null; closedStatus: string | null; personId: string | null; scheduledDateStart: string | null };

// The one writer of a team's open, to-assign and to-schedule counts. It writes only the counts that differ.
export const recomputeTeamCounts = async (teamIds: (string | null | undefined)[]) => {
  const ids = [...new Set(teamIds.filter((id): id is string => typeof id === 'string'))];

  if (ids.length === 0) {
    return;
  }
  const found = await findMany<{ teams: TeamCountRow[]; orders: CountedOrder[] }>({
    teams: { of: fsmTeams, filter: { id: { in: ids } }, selection: 'id orderCount orderNeedAssignCount orderNeedScheduleCount' },
    orders: { of: fsmOrders, filter: { teamId: { in: ids } }, selection: 'teamId closedStatus personId scheduledDateStart' },
  });

  for (const team of found.teams) {
    const counts = teamCounts(
      found.orders
        .filter((order) => order.teamId === team.id)
        .map((order) => ({
          closed: order.closedStatus !== null && order.closedStatus !== CLOSED_STATUS.OPEN,
          workerId: order.personId,
          scheduledStart: order.scheduledDateStart,
        })),
    );
    const changed = {
      ...(team.orderCount === counts.open ? {} : { orderCount: counts.open }),
      ...(team.orderNeedAssignCount === counts.needAssign ? {} : { orderNeedAssignCount: counts.needAssign }),
      ...(team.orderNeedScheduleCount === counts.needSchedule ? {} : { orderNeedScheduleCount: counts.needSchedule }),
    };

    await fsmTeams.update(team.id, changed);
  }
};
