import { RULE_ACTION, RULE_PROCURE_METHOD } from 'src/stock/routing-options.constant';
import { LOCATION_USAGE } from 'src/stock/stock-options.constant';
import { type RuleAction } from 'src/stock/types/rule-action.type';
import { type RuleProcureMethod } from 'src/stock/types/rule-procure-method.type';
import { type ProductRoutesReport } from 'src/stock/utils/types/product-routes-report.type';
import { type RoutesReportCell } from 'src/stock/utils/types/routes-report-cell.type';
import { type RoutesReportHeader } from 'src/stock/utils/types/routes-report-header.type';
import { type RoutesReportLocation } from 'src/stock/utils/types/routes-report-location.type';
import { type RoutesReportOrderpoint } from 'src/stock/utils/types/routes-report-orderpoint.type';
import { type RoutesReportPutaway } from 'src/stock/utils/types/routes-report-putaway.type';
import { type RoutesReportRow } from 'src/stock/utils/types/routes-report-row.type';
import { type RoutesReportRule } from 'src/stock/utils/types/routes-report-rule.type';
import { type RoutesReportSegment } from 'src/stock/utils/types/routes-report-segment.type';
import { type RuleSegmentMark } from 'src/stock/utils/types/rule-segment-mark.type';

// Routes take the colours in turn; the page holds the colours themselves.
export const ROUTE_COLOR_COUNT = 7;

type RuleLocation = { rule: RoutesReportRule; source: string | null; destination: string | null };

const union = (...lists: (string | null)[][]) => [...new Set(lists.flat().filter((id): id is string => id !== null))];

// A pull rule hands the goods to its operation type's destination; push rules
// move them to the rule's own destination.
const ruleLocation = (rule: RoutesReportRule): RuleLocation => ({
  rule,
  source: rule.locationSrcId,
  destination: rule.action === RULE_ACTION.PULL ? rule.pickingTypeDefaultDestId : rule.locationDestId,
});

// A warehouse's locations in flow order: the ones no remaining rule leads to
// come first, then where their rules go, and so on. The list and the used
// rules only travel down the recursion.
const sortByWarehouse = (
  rulesAndLocations: RuleLocation[],
  usedRuleIds: string[],
  startIds: string[],
  orderedIds: string[],
  warehouseId: string,
  locations: Map<string, RoutesReportLocation>,
): string[] => {
  const start = startIds.filter((id) => locations.get(id)?.warehouseId === warehouseId);
  const ordered = union(orderedIds, start);
  const startingRules = rulesAndLocations.filter((item) => item.source !== null && start.includes(item.source));

  if (startingRules.length === 0) {
    return ordered;
  }
  const used = union(usedRuleIds, startingRules.map((item) => item.rule.id));
  const remainingDestinations = union(rulesAndLocations.filter((item) => !used.includes(item.rule.id)).map((item) => item.destination));
  const next = startingRules
    .map((item) => item.destination)
    .filter((id): id is string => id !== null && !ordered.includes(id) && !remainingDestinations.includes(id));

  return sortByWarehouse(rulesAndLocations, used, next, ordered, warehouseId, locations);
};

// Vendor and production locations first, then each warehouse's chain, then
// customers, then whatever is left.
const sortLocations = (rulesAndLocations: RuleLocation[], warehouseIds: string[], locations: Map<string, RoutesReportLocation>) => {
  const allSources = union(rulesAndLocations.map((item) => item.source));
  const allDestinations = union(rulesAndLocations.map((item) => item.destination));
  const all = union(allSources, allDestinations);
  const usageOf = (id: string) => locations.get(id)?.usage ?? '';
  let result = all.filter((id) => usageOf(id) === LOCATION_USAGE.SUPPLIER || usageOf(id) === LOCATION_USAGE.PRODUCTION);

  for (const warehouseId of warehouseIds) {
    const warehouseLocations = all.filter((id) => locations.get(id)?.warehouseId === warehouseId);
    const entering = rulesAndLocations.filter((item) => item.source === null || !warehouseLocations.includes(item.source));
    const start =
      entering.length > 0
        ? union(entering.map((item) => item.destination))
        : union(
            rulesAndLocations
              .filter((item) => item.source === null || !allDestinations.includes(item.source))
              .map((item) => item.source),
          );

    result = union(result, sortByWarehouse(rulesAndLocations, [], start, [], warehouseId, locations));
    if (warehouseLocations.some((id) => !result.includes(id))) {
      const remaining = allSources.filter((id) => !result.includes(id));

      result = union(result, sortByWarehouse(rulesAndLocations, [], remaining, [], warehouseId, locations));
    }
  }
  result = union(result, all.filter((id) => usageOf(id) === LOCATION_USAGE.CUSTOMER));

  return union(result, all);
};

export const productRoutesReport = ({
  routes,
  rules,
  locations,
  warehouseIds,
  orderpoints,
  putaways,
}: {
  routes: { id: string; name: string; ruleIds: string[] }[];
  rules: RoutesReportRule[];
  locations: Map<string, RoutesReportLocation>;
  warehouseIds: string[];
  orderpoints: RoutesReportOrderpoint[];
  putaways: RoutesReportPutaway[];
}): ProductRoutesReport => {
  const ruleById = new Map(rules.map((item) => [item.id, item]));
  // A route without a warehouse may still hold rules of several warehouses:
  // only those of the chosen warehouses show.
  const relevant = new Map(
    union(routes.flatMap((route) => route.ruleIds))
      .flatMap((id) => ruleById.get(id) ?? [])
      .filter((item) => item.warehouseId === null || warehouseIds.includes(item.warehouseId))
      .map((item) => [item.id, ruleLocation(item)]),
  );
  const rulesAndLocations = [...relevant.values()];
  const orderedIds = union(
    sortLocations(rulesAndLocations, warehouseIds, locations),
    orderpoints.map((orderpoint) => orderpoint.locationId),
  );
  const orderedLocations = orderedIds.flatMap((id) => locations.get(id) ?? []);
  const names = orderedLocations.map((location) => location.name);
  const headers: Record<string, RoutesReportHeader> = {};

  for (const location of orderedLocations) {
    const putaway = putaways.filter((item) => item.locationInId === location.id);
    const orderpoint = orderpoints.filter((item) => item.locationId === location.id);

    if (putaway.length > 0 || orderpoint.length > 0) {
      headers[location.id] = { putaway, orderpoint };
    }
  }
  // Every route counts for the colours, also one that shows no rule here.
  const rows = routes.flatMap((route, index) =>
    route.ruleIds.flatMap((id): RoutesReportRow[] => {
      const item = relevant.get(id);

      if (item === undefined) {
        return [];
      }
      const cells: RoutesReportCell[] = orderedLocations.map(() => null);
      // Columns are matched by the location's full name; the source is marked
      // last so it wins when a rule starts and ends in the same place.
      const mark = (locationId: string | null, kind: 'origin' | 'destination') => {
        const name = locationId === null ? undefined : locations.get(locationId)?.name;
        const position = name === undefined ? -1 : names.indexOf(name);

        if (position >= 0) {
          cells[position] = { kind };
        }
      };

      mark(item.destination, 'destination');
      mark(item.source, 'origin');

      return [
        {
          routeId: route.id,
          routeName: route.name,
          colorIndex: index % ROUTE_COLOR_COUNT,
          ruleId: id,
          ruleName: item.rule.name,
          action: item.rule.action,
          procureMethod: item.rule.procureMethod,
          pickingTypeName: item.rule.pickingTypeName,
          cells,
        },
      ];
    }),
  );

  return { locations: orderedLocations, headers, rows };
};

// A rule's row as table cells: the cells from its first mark to its second
// become one cell that carries the second mark; the others stay empty.
export const routeRowSegments = (cells: RoutesReportCell[]): RoutesReportSegment[] => {
  const segments: RoutesReportSegment[] = [];
  let open: { span: number; cell: RoutesReportCell } | null = null;

  for (const cell of cells) {
    if (open === null) {
      if (cell === null) {
        segments.push({ span: 1, cell: null });
      } else {
        open = { span: 1, cell };
      }
    } else if (cell === null) {
      open.span += 1;
    } else {
      segments.push({ span: open.span + 1, cell });
      open = null;
    }
  }
  if (open !== null) {
    segments.push({ span: 1, cell: open.cell }, ...Array.from({ length: open.span - 1 }, () => ({ span: 1, cell: null })));
  }

  return segments;
};

const pulls = (action: RuleAction) => action === RULE_ACTION.PULL || action === RULE_ACTION.PULL_PUSH;
const pushes = (action: RuleAction) => action === RULE_ACTION.PUSH || action === RULE_ACTION.PULL_PUSH;

// The symbols on each side of a rule's line. `closing` is the mark of the
// cell where the line ends on the right: a destination there means the goods
// flow left to right.
export const ruleSegmentMarks = (
  closing: 'origin' | 'destination',
  action: RuleAction,
  procureMethod: RuleProcureMethod,
): { before: RuleSegmentMark[]; after: RuleSegmentMark[] } => {
  if (closing === 'destination') {
    const before: RuleSegmentMark[] = [];

    if (procureMethod === RULE_PROCURE_METHOD.MAKE_TO_ORDER) {
      before.push('POINTS');
    }
    if (procureMethod === RULE_PROCURE_METHOD.MTS_ELSE_MTO) {
      before.push('POINTS', 'BAR');
    }
    if (pushes(action)) {
      before.push('RIGHT');
    }

    return { before, after: pulls(action) ? ['RIGHT'] : [] };
  }
  const after: RuleSegmentMark[] = [];

  if (pushes(action)) {
    after.push('LEFT');
  }
  if (procureMethod === RULE_PROCURE_METHOD.MAKE_TO_ORDER) {
    after.push('POINTS');
  }

  return { before: pulls(action) ? ['LEFT'] : [], after };
};
