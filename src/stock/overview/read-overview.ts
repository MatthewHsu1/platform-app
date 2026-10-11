import { requireData, twentyGraphql, twentyMetadata } from 'src/shared/twenty-graphql';
import { chunks } from 'src/shared/utils/chunks.util';
import { type OverviewAnswer } from 'src/stock/overview/types/overview-answer.type';
import { findAsPerson } from 'src/stock/stock-person-writes';
import {
  OVERVIEW_COUNT_VIEW_UNIVERSAL_IDENTIFIERS,
  OVERVIEW_TYPE_VIEW_UNIVERSAL_IDENTIFIERS,
} from 'src/stock/stock-reports-universal-identifiers.constant';
import { todayUtc } from 'src/stock/stock-settings';
import { type PickingTypeCode } from 'src/stock/types/picking-type-code.type';
import { OVERVIEW_COUNTS, overviewCountFilter, overviewWarehouses } from 'src/stock/utils/overview-counts.util';
import { type OverviewCount } from 'src/stock/utils/types/overview-count.type';
import { type OverviewCountGroup } from 'src/stock/utils/types/overview-count-group.type';
import { type OverviewTypeRow } from 'src/stock/utils/types/overview-type-row.type';

type TypeRead = {
  id: string;
  name: string;
  sequence: number | null;
  code: PickingTypeCode;
  warehouse: { id: string; name: string; deletedAt: string | null } | null;
};

type GroupRead = { groupByDimensionValues: (string | null)[]; totalCount: number | null };

const TYPE_IDS_PER_QUERY = 200;

const readActiveTypes = async (): Promise<OverviewTypeRow[]> =>
  (
    await findAsPerson<TypeRead>(
      'stockPickingTypes',
      'StockPickingTypeFilterInput',
      { active: { eq: true } },
      'id name sequence code warehouse { id name deletedAt }',
    )
  ).map(({ warehouse, ...type }) => ({
    ...type,
    warehouseId: warehouse?.id ?? null,
    warehouseName: warehouse?.name ?? null,
  }));

// Grouped as the clicking user, so a transfer their row rules hide is not counted.
const countGroups = async (count: OverviewCount, typeIds: string[], today: string): Promise<OverviewCountGroup[]> => {
  const data = requireData(
    await twentyGraphql<{ stockPickingsGroupBy: GroupRead[] }>(
      'person',
      `query OverviewCount($filter: StockPickingFilterInput, $limit: Int) {
        stockPickingsGroupBy(groupBy: [{ pickingTypeId: true }], filter: $filter, limit: $limit) {
          groupByDimensionValues
          totalCount
        }
      }`,
      { filter: { and: [{ pickingTypeId: { in: typeIds } }, overviewCountFilter(count, today)] }, limit: typeIds.length },
    ),
    'Count transfers',
  );

  return data.stockPickingsGroupBy.map((group) => ({
    count,
    pickingTypeId: group.groupByDimensionValues[0] ?? null,
    total: group.totalCount ?? 0,
  }));
};

const pickViewIds = <TKey extends string>(views: Map<string, string>, universalIdentifiers: Record<TKey, string>) => {
  const viewIds: Partial<Record<TKey, string>> = {};

  for (const key of Object.keys(universalIdentifiers) as TKey[]) {
    const viewId = views.get(universalIdentifiers[key]);

    if (viewId !== undefined) {
      viewIds[key] = viewId;
    }
  }
  return viewIds;
};

// View ids differ per workspace; the app's own views are found by their
// universal ids with the app's token. Without them the links still open the
// right transfers, only in the object's first list.
const readViewIds = async () => {
  try {
    const data = requireData(
      await twentyMetadata<{ getViews: { id: string; universalIdentifier: string | null }[] }>(
        'application',
        'query { getViews { id universalIdentifier } }',
      ),
      'Read views',
    );
    const views = new Map(data.getViews.flatMap((view) => (view.universalIdentifier === null ? [] : [[view.universalIdentifier, view.id] as const])));

    return {
      countViewIds: pickViewIds(views, OVERVIEW_COUNT_VIEW_UNIVERSAL_IDENTIFIERS),
      typeViewIds: pickViewIds(views, OVERVIEW_TYPE_VIEW_UNIVERSAL_IDENTIFIERS),
    };
  } catch {
    return { countViewIds: {}, typeViewIds: {} };
  }
};

export const readOverview = async (): Promise<OverviewAnswer> => {
  const types = await readActiveTypes();
  const today = todayUtc();
  const parts = chunks(
    types.map((type) => type.id),
    TYPE_IDS_PER_QUERY,
  );
  const [groups, viewIds] = await Promise.all([
    Promise.all(OVERVIEW_COUNTS.flatMap((count) => parts.map((typeIds) => countGroups(count, typeIds, today)))),
    readViewIds(),
  ]);

  return { ...viewIds, warehouses: overviewWarehouses(types, groups.flat()) };
};
