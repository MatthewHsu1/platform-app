import {
  type InstallObject,
  type ModuleInstallSpec,
  type SelectOption,
} from 'src/shared/install/install-spec.type';

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
  }) => Promise<void>;
};

const PLATFORM_MAJOR_VERSION = 2;

// Default rows go in once, when the platform is first installed (fresh, or
// over the 1.x app). Later runs skip them so rows staff delete stay deleted.
const isFirstPlatformInstall = (previousVersion: string | undefined) => {
  if (previousVersion === undefined || previousVersion.length === 0) {
    return true;
  }

  return Number.parseInt(previousVersion.split('.')[0], 10) < PLATFORM_MAJOR_VERSION;
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

  if (isFirstPlatformInstall(previousVersion)) {
    for (const rows of specs.flatMap((spec) => spec.defaultRows)) {
      const object = findObject(objects, rows.objectUniversalIdentifier);
      const existing = new Set(await api.listRecordNames(object));
      const missing = rows.names.filter((name) => !existing.has(name));

      if (missing.length > 0) {
        await api.createRecords(object, missing);
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
      await api.createBoard({
        objectMetadataId: object.id,
        name: board.name,
        icon: board.icon,
        groupByFieldMetadataId,
        hideWhere,
      });
    } catch (error) {
      skippedBoards.push({
        name: board.name,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { skippedBoards };
};
