import {
  type InstallObject,
  type ListViewSpec,
  type ModuleInstallSpec,
  type SelectOption,
} from 'src/shared/install/install-spec.type';
import { type ViewFilterSpec } from 'src/shared/install/types/view-filter-spec.type';

export type InstallApi = {
  listObjects: () => Promise<InstallObject[]>;
  createField: (input: {
    objectMetadataId: string;
    name: string;
    label: string;
    icon: string;
    type: 'SELECT' | 'MULTI_SELECT';
    defaultValue: string | undefined;
    options: SelectOption[];
  }) => Promise<void>;
  listRecordNames: (object: InstallObject) => Promise<string[]>;
  createRecords: (object: InstallObject, names: string[]) => Promise<void>;
  listViewNames: (objectMetadataId: string) => Promise<string[]>;
  createBoard: (input: {
    objectMetadataId: string;
    name: string;
    icon: string;
    groupByFieldMetadataId: string;
    hideWhere?: { fieldMetadataId: string; values: string[] };
    filters?: { fieldMetadataId: string; operand: ViewFilterSpec['operand']; value: string }[];
    aggregate?: { operation: 'SUM'; fieldMetadataId: string };
    cardFieldMetadataIds?: string[];
  }) => Promise<void>;
  createListView: (input: { objectMetadataId: string; name: string; icon: string }) => Promise<string>;
  showViewField: (input: { viewId: string; fieldMetadataId: string; position: number; isVisible?: boolean }) => Promise<void>;
  listViewFields: (viewId: string) => Promise<{ fieldMetadataId: string; position: number }[]>;
  deleteView: (viewId: string) => Promise<void>;
  createViewFilterGroup: (input: { viewId: string; logicalOperator: 'AND' | 'OR'; parentViewFilterGroupId?: string }) => Promise<string>;
  createViewFilter: (input: {
    viewId: string;
    fieldMetadataId: string;
    operand: ViewFilterSpec['operand'];
    value: string;
    viewFilterGroupId?: string;
  }) => Promise<void>;
  listViews: (objectMetadataId: string) => Promise<{ id: string; name: string; key: string | null }[]>;
  listViewSorts: (viewId: string) => Promise<{ id: string }[]>;
  createViewSort: (input: { viewId: string; fieldMetadataId: string; direction: 'ASC' | 'DESC' }) => Promise<void>;
  listSeedKeys: (object: InstallObject) => Promise<Map<string, string>>;
  createSeedRow: (object: InstallObject, values: Record<string, unknown>) => Promise<string>;
  listUnkeyedRows: (object: InstallObject, names: string[]) => Promise<{ id: string; name: string; createdAt: string }[]>;
  setSeedKey: (object: InstallObject, id: string, seedKey: string) => Promise<void>;
  areValidationRulesEnabled: () => Promise<boolean>;
  listValidationRuleNames: (objectMetadataId: string) => Promise<string[]>;
  createValidationRule: (input: {
    objectMetadataId: string;
    name: string;
    expression: string;
    message: string;
  }) => Promise<void>;
};

// The filter value as the view API stores it. A condition that takes no value stores an empty text.
export const viewFilterValue = (value: ViewFilterSpec['value'], operand: ViewFilterSpec['operand'] = 'IS'): string => {
  if (operand === 'IS_EMPTY' || operand === 'IS_IN_PAST') {
    return '';
  }
  if (value === 'CURRENT_MEMBER') {
    return JSON.stringify({ isCurrentWorkspaceMemberSelected: true, selectedRecordIds: [] });
  }

  return typeof value === 'boolean' ? String(value) : JSON.stringify(value);
};

const versionParts = (version: string) =>
  version.split('.').map((part) => Number.parseInt(part, 10) || 0);

// Default and seed rows go in once, when a module is first installed (fresh,
// or on an upgrade from before the module's first version). Later runs skip
// them so rows staff delete stay deleted.
export const isNewModule = (previousVersion: string | undefined, firstVersion: string) => {
  if (previousVersion === undefined || previousVersion.length === 0) {
    return true;
  }

  const previous = versionParts(previousVersion);
  const first = versionParts(firstVersion);

  for (let index = 0; index < 3; index += 1) {
    const difference = (previous[index] ?? 0) - (first[index] ?? 0);

    if (difference !== 0) {
      return difference < 0;
    }
  }

  return false;
};

const findObject = (objects: InstallObject[], universalIdentifier: string) => {
  const object = objects.find((candidate) => candidate.universalIdentifier === universalIdentifier);

  if (object === undefined) {
    throw new Error(`Install: no object with universal id ${universalIdentifier}`);
  }

  return object;
};

const findFieldId = (object: InstallObject, name: string) => {
  const field = object.fields.find((candidate) => candidate.name === name);

  if (field === undefined) {
    throw new Error(`Install: ${object.nameSingular} has no field ${name}`);
  }

  return field.id;
};

// A table view with its columns and filters. `anyOf` becomes one group of alternatives; a member that is itself a
// list of conditions becomes a group inside it. The label field is the first column: Twenty keeps it in the lowest
// position.
const makeListView = async (api: InstallApi, object: InstallObject, list: ListViewSpec) => {
  const viewId = await api.createListView({ objectMetadataId: object.id, name: list.name, icon: list.icon });

  // A list that stops half made would be found by name on the next install and left as it is: it is removed
  // instead, so the next install makes it again.
  try {
    for (const [position, fieldName] of list.columns.entries()) {
      await api.showViewField({ viewId, fieldMetadataId: findFieldId(object, fieldName), position });
    }
    const filterOf = (filter: ViewFilterSpec) => ({
      viewId,
      fieldMetadataId: findFieldId(object, filter.fieldName),
      operand: filter.operand,
      value: viewFilterValue(filter.value, filter.operand),
    });

    for (const filter of list.filters) {
      await api.createViewFilter(filterOf(filter));
    }
    if (list.anyOf === undefined || list.anyOf.length === 0) {
      return;
    }
    const alternatives = await api.createViewFilterGroup({ viewId, logicalOperator: 'OR' });

    for (const member of list.anyOf) {
      if ('allOf' in member) {
        const group = await api.createViewFilterGroup({ viewId, logicalOperator: 'AND', parentViewFilterGroupId: alternatives });

        for (const filter of member.allOf) {
          await api.createViewFilter({ ...filterOf(filter), viewFilterGroupId: group });
        }
      } else {
        await api.createViewFilter({ ...filterOf(member), viewFilterGroupId: alternatives });
      }
    }
  } catch (error) {
    await api.deleteView(viewId).catch(() => undefined);
    throw error;
  }
};

// Safe to run on every install and upgrade: it only adds what is missing and
// never changes a field, row or view that already exists. A board the server
// refuses is skipped and returned, not thrown: a thrown error rolls back a
// fresh install. Twenty before v2.42 refuses createView to every app token;
// there staff make the board by hand.
export const runInstall = async ({
  api,
  specs,
  previousVersion,
}: {
  api: InstallApi;
  specs: ModuleInstallSpec[];
  previousVersion: string | undefined;
}) => {
  let objects = await api.listObjects();
  let createdAField = false;

  for (const staffList of specs.flatMap((spec) => spec.staffLists)) {
    const object = findObject(objects, staffList.objectUniversalIdentifier);

    if (object.fields.some((field) => field.name === staffList.name)) {
      continue;
    }

    await api.createField({
      objectMetadataId: object.id,
      name: staffList.name,
      label: staffList.label,
      icon: staffList.icon,
      type: staffList.type,
      defaultValue: staffList.defaultValue,
      options: staffList.options,
    });
    createdAField = true;
  }

  if (createdAField) {
    objects = await api.listObjects();
  }

  for (const spec of specs) {
    if (!isNewModule(previousVersion, spec.firstVersion)) {
      continue;
    }

    for (const rows of spec.defaultRows) {
      const object = findObject(objects, rows.objectUniversalIdentifier);
      const existing = new Set(await api.listRecordNames(object));
      const missing = rows.names.filter((name) => !existing.has(name));

      if (missing.length > 0) {
        await api.createRecords(object, missing);
      }
    }

    // Seed keys by object, read once and kept up to date as rows are made, so a row can name a parent
    // made earlier in this run, in its own object or in another one.
    const seedKeysByObject = new Map<string, Map<string, string>>();
    const seedKeysOf = async (universalIdentifier: string) => {
      const known = seedKeysByObject.get(universalIdentifier);

      if (known !== undefined) {
        return known;
      }
      const read = await api.listSeedKeys(findObject(objects, universalIdentifier));

      seedKeysByObject.set(universalIdentifier, read);
      return read;
    };

    for (const { objectUniversalIdentifier, rows } of spec.seedRows) {
      const object = findObject(objects, objectUniversalIdentifier);
      const idBySeedKey = await seedKeysOf(objectUniversalIdentifier);

      for (const row of rows) {
        if (idBySeedKey.has(row.seedKey)) {
          continue;
        }

        const values: Record<string, unknown> = { ...row.values, seedKey: row.seedKey };

        if (row.parentSeedKey !== undefined && row.parentFieldName !== undefined) {
          const parentId = (await seedKeysOf(row.parentObjectUniversalIdentifier ?? objectUniversalIdentifier)).get(row.parentSeedKey);

          if (parentId === undefined) {
            throw new Error(`Install: seed row ${row.seedKey} needs ${row.parentSeedKey} first`);
          }
          values[`${row.parentFieldName}Id`] = parentId;
        }

        idBySeedKey.set(row.seedKey, await api.createSeedRow(object, values));
      }
    }

    for (const backfill of spec.seedKeyBackfills ?? []) {
      const object = findObject(objects, backfill.objectUniversalIdentifier);
      const held = await api.listSeedKeys(object);
      const missing = backfill.keys.filter((key) => !held.has(key.seedKey));

      if (missing.length === 0) {
        continue;
      }

      // The oldest row with exactly the default name is the default row; a
      // key whose row was renamed or deleted stays unused.
      const candidates = (await api.listUnkeyedRows(object, missing.map((key) => key.name))).sort(
        (left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
      );
      const taken = new Set<string>();

      for (const key of missing) {
        const row = candidates.find((candidate) => candidate.name === key.name && !taken.has(candidate.id));

        if (row !== undefined) {
          taken.add(row.id);
          await api.setSeedKey(object, row.id, key.seedKey);
        }
      }
    }
  }

  const skippedBoards: { name: string; reason: string }[] = [];

  for (const board of specs.flatMap((spec) => spec.boards)) {
    const object = findObject(objects, board.objectUniversalIdentifier);
    const existingViews = await api.listViewNames(object.id);

    if (existingViews.includes(board.name)) {
      continue;
    }

    const groupByFieldMetadataId = findFieldId(object, board.groupByFieldName);
    const hideWhere =
      board.hideWhere === undefined
        ? undefined
        : {
            fieldMetadataId: findFieldId(object, board.hideWhere.fieldName),
            values: board.hideWhere.values,
          };

    try {
      const aggregate =
        board.aggregate === undefined
          ? undefined
          : { operation: board.aggregate.operation, fieldMetadataId: findFieldId(object, board.aggregate.fieldName) };

      await api.createBoard({
        objectMetadataId: object.id,
        name: board.name,
        icon: board.icon,
        groupByFieldMetadataId,
        hideWhere,
        filters: board.filters?.map((filter) => ({
          fieldMetadataId: findFieldId(object, filter.fieldName),
          operand: filter.operand,
          value: viewFilterValue(filter.value, filter.operand),
        })),
        aggregate,
        cardFieldMetadataIds: board.cardFields?.map((fieldName) => findFieldId(object, fieldName)),
      });
    } catch (error) {
      skippedBoards.push({
        name: board.name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // A list the hook makes is skipped when its view exists already, so a list staff changed is left alone.
  for (const list of specs.flatMap((spec) => spec.lists ?? [])) {
    const object = findObject(objects, list.objectUniversalIdentifier);

    if ((await api.listViewNames(object.id)).includes(list.name)) {
      continue;
    }
    try {
      await makeListView(api, object, list);
    } catch (error) {
      skippedBoards.push({ name: list.name, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  let validationRulesSkipped = false;
  const validationRules = specs.flatMap((spec) => spec.validationRules);

  if (validationRules.length > 0) {
    if (await api.areValidationRulesEnabled()) {
      for (const rule of validationRules) {
        const object = findObject(objects, rule.objectUniversalIdentifier);
        const existingNames = await api.listValidationRuleNames(object.id);

        if (!existingNames.includes(rule.name)) {
          await api.createValidationRule({
            objectMetadataId: object.id,
            name: rule.name,
            expression: rule.expression,
            message: rule.message,
          });
        }
      }
    } else {
      validationRulesSkipped = true;
    }
  }

  // The object's main list is sorted once, when its module first arrives, and
  // only while staff have set no sort: a sort staff remove stays removed.
  const skippedViewSorts: { objectUniversalIdentifier: string; reason: string }[] = [];
  const newViewSorts = specs.filter((spec) => isNewModule(previousVersion, spec.firstVersion)).flatMap((spec) => spec.viewSorts ?? []);

  for (const viewSort of newViewSorts) {
    const object = findObject(objects, viewSort.objectUniversalIdentifier);

    try {
      const index = (await api.listViews(object.id)).find((view) => view.key === 'INDEX');

      if (index === undefined) {
        skippedViewSorts.push({ objectUniversalIdentifier: viewSort.objectUniversalIdentifier, reason: 'no main list' });
        continue;
      }
      if ((await api.listViewSorts(index.id)).length > 0) {
        continue;
      }
      for (const sort of viewSort.sorts) {
        await api.createViewSort({ viewId: index.id, fieldMetadataId: findFieldId(object, sort.fieldName), direction: sort.direction });
      }
    } catch (error) {
      skippedViewSorts.push({
        objectUniversalIdentifier: viewSort.objectUniversalIdentifier,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Columns added to existing views, once per module, in the order of the specs.
  const skippedColumns: { viewName: string; reason: string }[] = [];

  for (const columns of specs.filter((spec) => isNewModule(previousVersion, spec.firstVersion)).flatMap((spec) => spec.viewColumns ?? [])) {
    try {
      const object = findObject(objects, columns.objectUniversalIdentifier);
      const view = (await api.listViews(object.id)).find((candidate) => candidate.name === columns.viewName);

      if (view === undefined) {
        skippedColumns.push({ viewName: columns.viewName, reason: 'no such view' });
        continue;
      }
      const held = await api.listViewFields(view.id);
      const taken = new Set(held.map((field) => field.fieldMetadataId));
      let position = held.reduce((highest, field) => Math.max(highest, field.position + 1), 0);

      for (const fieldName of columns.fieldNames) {
        const fieldMetadataId = findFieldId(object, fieldName);

        if (!taken.has(fieldMetadataId)) {
          await api.showViewField({ viewId: view.id, fieldMetadataId, position, isVisible: columns.isVisible });
          position += 1;
        }
      }
    } catch (error) {
      skippedColumns.push({ viewName: columns.viewName, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  return { skippedBoards, validationRulesSkipped, skippedViewSorts, skippedColumns };
};
