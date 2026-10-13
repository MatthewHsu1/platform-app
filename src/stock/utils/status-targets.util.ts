import { LOCATION_USAGE, MOVE_STATE } from 'src/stock/stock-options.constant';
import { type MoveState } from 'src/stock/types/move-state.type';
import { type StatusTarget } from 'src/stock/utils/types/status-target.type';

const CLOSED_LINE_STATES = new Set<MoveState>([MOVE_STATE.DONE, MOVE_STATE.CANCEL]);

// The transfers the moves continue into, except the transfer's own returns.
export const nextTransferIds = ({
  destinationPickingIds,
  returnIds,
}: {
  destinationPickingIds: string[];
  returnIds: string[];
}) => [...new Set(destinationPickingIds)].filter((id) => !returnIds.includes(id));

// One match opens its record; several are only counted.
export const statusTarget = (ids: string[]): StatusTarget =>
  ids.length === 0 ? { kind: 'none' } : ids.length === 1 ? { kind: 'record', id: ids[0] } : { kind: 'list', ids };

// A transfer that is not done shows the packages its open lines put things in.
export const openLinePackageIds = (lines: { state: MoveState; resultPackageId: string | null }[]) => [
  ...new Set(lines.flatMap((line) => (CLOSED_LINE_STATES.has(line.state) || !line.resultPackageId ? [] : [line.resultPackageId]))),
];

// A package list shows by default only the outermost packages: the rows that
// go into no other package.
export const mainPackageIds = (rows: { id: string; containerId: string | null }[]) =>
  rows.flatMap((row) => (row.containerId ? [] : [row.id]));

// Dates are YYYY-MM-DD, so text order is date order.
export const isNotSnoozed = (snoozedUntil: string | null, today: string) => !snoozedUntil || snoozedUntil <= today;

export const inInternalWarehouseLocation = (
  location: { usage: string; warehouseId: string | null; deletedAt: string | null } | null,
) => location !== null && !location.deletedAt && location.usage === LOCATION_USAGE.INTERNAL && !!location.warehouseId;
