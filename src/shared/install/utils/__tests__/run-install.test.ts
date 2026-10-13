import { describe, expect, it } from 'vitest';

import {
  type InstallObject,
  type ModuleInstallSpec,
  type SeedRowsSpec,
} from 'src/shared/install/install-spec.type';
import { type InstallApi, runInstall } from 'src/shared/install/utils/run-install.util';

const LEAD = 'lead-universal-id';
const REASON = 'reason-universal-id';
const UOM_OBJECT = 'uom-universal-id';

const SPEC: ModuleInstallSpec = {
  firstVersion: '2.0.0',
  staffLists: [
    {
      objectUniversalIdentifier: LEAD,
      name: 'stage',
      label: 'Stage',
      icon: 'IconProgress',
      type: 'SELECT',
      defaultValue: "'NEW'",
      options: [
        { value: 'NEW', label: 'New', color: 'gray', position: 0 },
        { value: 'WON', label: 'Won', color: 'green', position: 1 },
      ],
    },
    {
      objectUniversalIdentifier: LEAD,
      name: 'tags',
      label: 'Tags',
      icon: 'IconTag',
      type: 'MULTI_SELECT',
      options: [{ value: 'OTHER', label: 'Other', color: 'gray', position: 0 }],
    },
  ],
  defaultRows: [
    { objectUniversalIdentifier: REASON, names: ['Too expensive', 'Not enough stock'] },
  ],
  seedRows: [],
  validationRules: [],
  boards: [
    {
      objectUniversalIdentifier: LEAD,
      name: 'Pipeline',
      icon: 'IconLayoutKanban',
      groupByFieldName: 'stage',
      hideWhere: { fieldName: 'wonStatus', values: ['LOST'] },
    },
  ],
};

type CreatedField = Parameters<InstallApi['createField']>[0];
type CreatedBoard = Parameters<InstallApi['createBoard']>[0];
type CreatedValidationRule = Parameters<InstallApi['createValidationRule']>[0];
type CreatedViewSort = Parameters<InstallApi['createViewSort']>[0];

const EMPTY_SPEC: ModuleInstallSpec = {
  firstVersion: '2.0.0',
  staffLists: [],
  defaultRows: [],
  seedRows: [],
  boards: [],
  validationRules: [],
};

const makeFakeApi = ({
  leadFields = [{ id: 'f-won', name: 'wonStatus' }],
  reasonNames = [],
  viewNames = [],
  seedKeys = {},
  validationRuleNames = [],
  validationRulesEnabled = true,
  indexSorts = [],
}: {
  leadFields?: { id: string; name: string }[];
  reasonNames?: string[];
  viewNames?: string[];
  seedKeys?: Record<string, Record<string, string>>;
  validationRuleNames?: string[];
  validationRulesEnabled?: boolean;
  indexSorts?: string[];
} = {}) => {
  const state = {
    leadFields: [...leadFields],
    reasonNames: [...reasonNames],
    viewNames: [...viewNames],
    createdFields: [] as CreatedField[],
    createdRecords: [] as { object: string; names: string[] }[],
    createdBoards: [] as CreatedBoard[],
    createdSeedRows: [] as { object: string; values: Record<string, unknown> }[],
    createdValidationRules: [] as CreatedValidationRule[],
    createdViewSorts: [] as CreatedViewSort[],
  };

  const objects = (): InstallObject[] => [
    {
      id: 'o-lead',
      universalIdentifier: LEAD,
      nameSingular: 'crmLead',
      namePlural: 'crmLeads',
      fields: state.leadFields,
    },
    {
      id: 'o-reason',
      universalIdentifier: REASON,
      nameSingular: 'crmLostReason',
      namePlural: 'crmLostReasons',
      fields: [],
    },
    {
      id: 'o-uom',
      universalIdentifier: UOM_OBJECT,
      nameSingular: 'uomUom',
      namePlural: 'uomUoms',
      fields: [],
    },
  ];

  const api: InstallApi = {
    listObjects: async () => objects(),
    createField: async (input) => {
      state.createdFields.push(input);
      state.leadFields.push({ id: `f-${input.name}`, name: input.name });
    },
    listRecordNames: async () => [...state.reasonNames],
    createRecords: async (object, names) => {
      state.createdRecords.push({ object: object.namePlural, names });
      state.reasonNames.push(...names);
    },
    listViewNames: async () => [...state.viewNames],
    createBoard: async (input) => {
      state.createdBoards.push(input);
      state.viewNames.push(input.name);
    },
    listSeedKeys: async (object) => new Map(Object.entries(seedKeys[object.nameSingular] ?? {})),
    createSeedRow: async (object, values) => {
      state.createdSeedRows.push({ object: object.nameSingular, values });
      return `id-${String(values.seedKey)}`;
    },
    listUnkeyedRows: async () => [],
    setSeedKey: async () => undefined,
    areValidationRulesEnabled: async () => validationRulesEnabled,
    listValidationRuleNames: async () => [...validationRuleNames],
    createValidationRule: async (input) => {
      state.createdValidationRules.push(input);
    },
    listViews: async () => [
      { id: 'v-index', name: 'All Leads', key: 'INDEX' },
      ...state.viewNames.map((name) => ({ id: `v-${name}`, name, key: null })),
    ],
    listViewSorts: async (viewId) => [
      ...indexSorts.map((id) => ({ id })),
      ...state.createdViewSorts.filter((sort) => sort.viewId === viewId).map((_sort, index) => ({ id: `sort-${index}` })),
    ],
    createViewSort: async (input) => {
      state.createdViewSorts.push(input);
    },
  };

  return { api: Object.assign(api, { createdSeedRows: state.createdSeedRows, createdValidationRules: state.createdValidationRules }), state };
};

const fakeApi = (options: Parameters<typeof makeFakeApi>[0] = {}) => makeFakeApi(options).api;

describe('runInstall', () => {
  it('makes the staff lists, default rows and board on a first install', async () => {
    const { api, state } = makeFakeApi();

    await runInstall({ api, specs: [SPEC], previousVersion: undefined });

    expect(state.createdFields).toEqual([
      {
        objectMetadataId: 'o-lead',
        name: 'stage',
        label: 'Stage',
        icon: 'IconProgress',
        type: 'SELECT',
        defaultValue: "'NEW'",
        options: SPEC.staffLists[0].options,
      },
      {
        objectMetadataId: 'o-lead',
        name: 'tags',
        label: 'Tags',
        icon: 'IconTag',
        type: 'MULTI_SELECT',
        defaultValue: undefined,
        options: SPEC.staffLists[1].options,
      },
    ]);
    expect(state.createdRecords).toEqual([
      { object: 'crmLostReasons', names: ['Too expensive', 'Not enough stock'] },
    ]);
    expect(state.createdBoards).toEqual([
      {
        objectMetadataId: 'o-lead',
        name: 'Pipeline',
        icon: 'IconLayoutKanban',
        groupByFieldMetadataId: 'f-stage',
        hideWhere: { fieldMetadataId: 'f-won', values: ['LOST'] },
      },
    ]);
  });

  it('writes nothing when run again after it already ran', async () => {
    const { api, state } = makeFakeApi();
    await runInstall({ api, specs: [SPEC], previousVersion: undefined });
    state.createdFields.length = 0;
    state.createdRecords.length = 0;
    state.createdBoards.length = 0;

    await runInstall({ api, specs: [SPEC], previousVersion: '2.0.0' });

    expect(state.createdFields).toEqual([]);
    expect(state.createdRecords).toEqual([]);
    expect(state.createdBoards).toEqual([]);
  });

  it('leaves a staff list alone once it exists, whatever staff did to it', async () => {
    const { api, state } = makeFakeApi({
      leadFields: [
        { id: 'f-won', name: 'wonStatus' },
        { id: 'f-stage-staff', name: 'stage' },
      ],
    });

    await runInstall({ api, specs: [SPEC], previousVersion: '2.0.0' });

    expect(state.createdFields.map((field) => field.name)).toEqual(['tags']);
    expect(state.createdBoards[0].groupByFieldMetadataId).toBe('f-stage-staff');
  });

  it('does not bring back default rows staff deleted after the first install', async () => {
    const { api, state } = makeFakeApi({ reasonNames: ['Too expensive'] });

    await runInstall({ api, specs: [SPEC], previousVersion: '2.0.0' });

    expect(state.createdRecords).toEqual([]);
  });

  it('adds only the missing default rows when the platform is first installed over the 1.x app', async () => {
    const { api, state } = makeFakeApi({ reasonNames: ['Too expensive'] });

    await runInstall({ api, specs: [SPEC], previousVersion: '1.0.1' });

    expect(state.createdRecords).toEqual([
      { object: 'crmLostReasons', names: ['Not enough stock'] },
    ]);
  });

  it('keeps a board staff already have under that name', async () => {
    const { api, state } = makeFakeApi({ viewNames: ['Pipeline'] });

    await runInstall({ api, specs: [SPEC], previousVersion: undefined });

    expect(state.createdBoards).toEqual([]);
  });

  it('still makes the lists and rows when the server refuses the board, and names the board', async () => {
    const { api, state } = makeFakeApi();
    api.createBoard = async () => {
      throw new Error('Create view Pipeline: You do not have permission to create workspace-level views');
    };

    const result = await runInstall({ api, specs: [SPEC], previousVersion: undefined });

    expect(state.createdFields.map((field) => field.name)).toEqual(['stage', 'tags']);
    expect(state.createdRecords).toHaveLength(1);
    expect(result.skippedBoards).toEqual([
      {
        name: 'Pipeline',
        reason: 'Create view Pipeline: You do not have permission to create workspace-level views',
      },
    ]);
  });

  it('stops with the object name when a spec names an object that is not installed', async () => {
    const { api } = makeFakeApi();

    await expect(
      runInstall({
        api,
        specs: [{ ...SPEC, defaultRows: [{ objectUniversalIdentifier: 'missing', names: ['x'] }] }],
        previousVersion: undefined,
      }),
    ).rejects.toThrow('missing');
  });
});

describe('seed rows', () => {
  const units: SeedRowsSpec = {
    objectUniversalIdentifier: UOM_OBJECT,
    rows: [
      { seedKey: 'uom.product_uom_unit', values: { name: 'Units', relativeFactor: 1 } },
      {
        seedKey: 'uom.product_uom_pack_6',
        values: { name: 'Pack of 6', relativeFactor: 6 },
        parentSeedKey: 'uom.product_uom_unit',
        parentFieldName: 'relativeUom',
      },
    ],
  };
  const spec = { ...EMPTY_SPEC, firstVersion: '2.2.0', seedRows: [units] };

  it('makes every seed row on the module install, parents first, linked by id', async () => {
    const api = fakeApi();
    await runInstall({ api, specs: [spec], previousVersion: '2.1.1' });
    expect(api.createdSeedRows).toEqual([
      { object: 'uomUom', values: { name: 'Units', relativeFactor: 1, seedKey: 'uom.product_uom_unit' } },
      {
        object: 'uomUom',
        values: {
          name: 'Pack of 6',
          relativeFactor: 6,
          seedKey: 'uom.product_uom_pack_6',
          relativeUomId: 'id-uom.product_uom_unit',
        },
      },
    ]);
  });

  it('makes none on an upgrade from the module version or later', async () => {
    const api = fakeApi();
    await runInstall({ api, specs: [spec], previousVersion: '2.2.0' });
    expect(api.createdSeedRows).toEqual([]);
  });

  it('links a seed row to a parent made earlier in another object', async () => {
    const api = fakeApi();
    const pack: SeedRowsSpec = {
      objectUniversalIdentifier: REASON,
      rows: [
        {
          seedKey: 'reason.small',
          values: { name: 'Small' },
          parentSeedKey: 'uom.product_uom_unit',
          parentFieldName: 'uom',
          parentObjectUniversalIdentifier: UOM_OBJECT,
        },
      ],
    };

    await runInstall({ api, specs: [{ ...spec, seedRows: [units, pack] }], previousVersion: undefined });

    expect(api.createdSeedRows[api.createdSeedRows.length - 1]).toEqual({
      object: 'crmLostReason',
      values: { name: 'Small', seedKey: 'reason.small', uomId: 'id-uom.product_uom_unit' },
    });
  });

  it('skips a seed key that already exists, even after a rename', async () => {
    const api = fakeApi({ seedKeys: { uomUom: { 'uom.product_uom_unit': 'unit-id' } } });
    await runInstall({ api, specs: [spec], previousVersion: undefined });
    expect(api.createdSeedRows.map((row) => row.values.seedKey)).toEqual(['uom.product_uom_pack_6']);
    expect(api.createdSeedRows[0].values.relativeUomId).toBe('unit-id');
  });
});

describe('validation rules', () => {
  const spec: ModuleInstallSpec = {
    ...EMPTY_SPEC,
    validationRules: [
      {
        objectUniversalIdentifier: UOM_OBJECT,
        name: 'platform-uom-factor-not-zero',
        expression: 'relativeFactor != 0',
        message: 'A unit cannot contain 0 of its reference unit.',
      },
    ],
  };

  it('makes a rule that is missing', async () => {
    const api = fakeApi();
    await runInstall({ api, specs: [spec], previousVersion: undefined });
    expect(api.createdValidationRules).toEqual([
      {
        objectMetadataId: 'o-uom',
        name: 'platform-uom-factor-not-zero',
        expression: 'relativeFactor != 0',
        message: 'A unit cannot contain 0 of its reference unit.',
      },
    ]);
  });

  it('makes each rule once', async () => {
    const api = fakeApi({ validationRuleNames: ['platform-uom-factor-not-zero'] });
    await runInstall({ api, specs: [spec], previousVersion: undefined });
    expect(api.createdValidationRules).toEqual([]);
  });

  it('skips all rules and reports it when the workspace flag is off', async () => {
    const api = fakeApi({ validationRulesEnabled: false });
    const result = await runInstall({ api, specs: [spec], previousVersion: undefined });
    expect(api.createdValidationRules).toEqual([]);
    expect(result.validationRulesSkipped).toBe(true);
  });
});

describe('boards with an aggregate and card fields', () => {
  const spec: ModuleInstallSpec = {
    ...EMPTY_SPEC,
    firstVersion: '2.4.0',
    boards: [
      {
        objectUniversalIdentifier: LEAD,
        name: 'Pipeline',
        icon: 'IconLayoutKanban',
        groupByFieldName: 'stage',
        hideWhere: { fieldName: 'wonStatus', values: ['LOST'] },
        aggregate: { operation: 'SUM', fieldName: 'expectedRevenue' },
        cardFields: ['name', 'expectedRevenue'],
      },
    ],
  };
  const fields = [
    { id: 'f-won', name: 'wonStatus' },
    { id: 'f-stage', name: 'stage' },
    { id: 'f-revenue', name: 'expectedRevenue' },
    { id: 'f-name', name: 'name' },
  ];

  it('makes the board with the revenue sum and the card fields in their order', async () => {
    const { api, state } = makeFakeApi({ leadFields: fields });

    await runInstall({ api, specs: [spec], previousVersion: undefined });

    expect(state.createdBoards).toEqual([
      {
        objectMetadataId: 'o-lead',
        name: 'Pipeline',
        icon: 'IconLayoutKanban',
        groupByFieldMetadataId: 'f-stage',
        hideWhere: { fieldMetadataId: 'f-won', values: ['LOST'] },
        aggregate: { operation: 'SUM', fieldMetadataId: 'f-revenue' },
        cardFieldMetadataIds: ['f-name', 'f-revenue'],
      },
    ]);
  });
});

describe('board filters', () => {
  const spec: ModuleInstallSpec = {
    ...EMPTY_SPEC,
    firstVersion: '2.4.0',
    boards: [
      {
        objectUniversalIdentifier: LEAD,
        name: 'My pipeline',
        icon: 'IconLayoutKanban',
        groupByFieldName: 'stage',
        filters: [
          { fieldName: 'salesperson', operand: 'IS', value: 'CURRENT_MEMBER' },
          { fieldName: 'isRotting', operand: 'IS', value: true },
          { fieldName: 'wonStatus', operand: 'IS_NOT', value: ['LOST'] },
        ],
      },
    ],
  };
  const fields = [
    { id: 'f-stage', name: 'stage' },
    { id: 'f-salesperson', name: 'salesperson' },
    { id: 'f-rotting', name: 'isRotting' },
    { id: 'f-won', name: 'wonStatus' },
  ];

  it('passes each filter with its value as the view API stores it', async () => {
    const { api, state } = makeFakeApi({ leadFields: fields });

    await runInstall({ api, specs: [spec], previousVersion: undefined });

    expect(state.createdBoards[0]?.filters).toEqual([
      {
        fieldMetadataId: 'f-salesperson',
        operand: 'IS',
        value: '{"isCurrentWorkspaceMemberSelected":true,"selectedRecordIds":[]}',
      },
      { fieldMetadataId: 'f-rotting', operand: 'IS', value: 'true' },
      { fieldMetadataId: 'f-won', operand: 'IS_NOT', value: '["LOST"]' },
    ]);
  });
});

describe('view sorts', () => {
  const spec: ModuleInstallSpec = {
    ...EMPTY_SPEC,
    viewSorts: [
      {
        objectUniversalIdentifier: LEAD,
        viewName: 'All',
        sorts: [
          { fieldName: 'priority', direction: 'DESC' },
          { fieldName: 'createdAt', direction: 'DESC' },
        ],
      },
    ],
  };
  const fields = [
    { id: 'f-priority', name: 'priority' },
    { id: 'f-created', name: 'createdAt' },
  ];

  it("sorts the object's main list when it has no sort yet", async () => {
    const { api, state } = makeFakeApi({ leadFields: fields });

    await runInstall({ api, specs: [spec], previousVersion: undefined });

    expect(state.createdViewSorts).toEqual([
      { viewId: 'v-index', fieldMetadataId: 'f-priority', direction: 'DESC' },
      { viewId: 'v-index', fieldMetadataId: 'f-created', direction: 'DESC' },
    ]);
  });

  it('leaves the main list unsorted on an upgrade after the module first arrived, as staff left it', async () => {
    const { api, state } = makeFakeApi({ leadFields: fields });

    await runInstall({ api, specs: [{ ...spec, firstVersion: '2.4.0' }], previousVersion: '2.4.0' });

    expect(state.createdViewSorts).toEqual([]);
  });

  it('keeps a sort staff already chose', async () => {
    const { api, state } = makeFakeApi({ leadFields: fields, indexSorts: ['staff-sort'] });

    await runInstall({ api, specs: [spec], previousVersion: undefined });

    expect(state.createdViewSorts).toEqual([]);
  });

  it('adds no board or sort on a second run', async () => {
    const boardSpec: ModuleInstallSpec = {
      ...spec,
      firstVersion: '2.4.0',
      boards: [
        {
          objectUniversalIdentifier: LEAD,
          name: 'Pipeline',
          icon: 'IconLayoutKanban',
          groupByFieldName: 'stage',
        },
      ],
    };
    const { api, state } = makeFakeApi({
      leadFields: [...fields, { id: 'f-stage', name: 'stage' }],
    });
    await runInstall({ api, specs: [boardSpec], previousVersion: '2.3.0' });
    const boardsBefore = state.createdBoards.length;
    const sortsBefore = state.createdViewSorts.length;

    await runInstall({ api, specs: [boardSpec], previousVersion: '2.4.0' });

    expect(state.createdBoards.slice(boardsBefore)).toEqual([]);
    expect(state.createdViewSorts.slice(sortsBefore)).toEqual([]);
  });
});

describe('runInstall seed key backfill', () => {
  const SOURCE = 'source-universal-id';
  const BACKFILL_SPEC: ModuleInstallSpec = {
    ...EMPTY_SPEC,
    firstVersion: '2.4.0',
    seedKeyBackfills: [
      {
        objectUniversalIdentifier: SOURCE,
        keys: [
          { seedKey: 'utm.utm_source_referral', name: 'Referral' },
          { seedKey: 'utm.utm_source_newsletter', name: 'Newsletter' },
          { seedKey: 'utm.utm_source_monster', name: 'Monster' },
        ],
      },
    ],
  };

  const backfillApi = (rows: { id: string; name: string; createdAt: string; seedKey: string | null }[]) => {
    const keysSet: { id: string; seedKey: string }[] = [];
    const api: InstallApi = {
      ...fakeApi(),
      listObjects: async () => [{ id: 'o-source', universalIdentifier: SOURCE, nameSingular: 'utmSource', namePlural: 'utmSources', fields: [] }],
      listSeedKeys: async () => new Map(rows.flatMap((row) => (row.seedKey === null ? [] : [[row.seedKey, row.id] as [string, string]]))),
      listUnkeyedRows: async (_object, names) =>
        rows.filter((row) => row.seedKey === null && names.includes(row.name)).map(({ id, name, createdAt }) => ({ id, name, createdAt })),
      setSeedKey: async (_object, id, seedKey) => {
        keysSet.push({ id, seedKey });
        const row = rows.find((candidate) => candidate.id === id);

        if (row !== undefined) {
          row.seedKey = seedKey;
        }
      },
    };

    return { api, keysSet };
  };

  it('gives each key to the oldest row with exactly the default name on an upgrade', async () => {
    const { api, keysSet } = backfillApi([
      { id: 'referral-copy', name: 'Referral', createdAt: '2026-03-01T00:00:00.000Z', seedKey: null },
      { id: 'referral', name: 'Referral', createdAt: '2026-01-01T00:00:00.000Z', seedKey: null },
      { id: 'renamed', name: 'Our newsletter', createdAt: '2026-01-01T00:00:00.000Z', seedKey: null },
      { id: 'monster', name: 'Monster', createdAt: '2026-01-01T00:00:00.000Z', seedKey: 'utm.utm_source_monster' },
    ]);

    await runInstall({ api, specs: [BACKFILL_SPEC], previousVersion: '2.3.0' });

    expect(keysSet).toEqual([{ id: 'referral', seedKey: 'utm.utm_source_referral' }]);
  });

  it('writes nothing when run again', async () => {
    const { api, keysSet } = backfillApi([{ id: 'referral', name: 'Referral', createdAt: '2026-01-01T00:00:00.000Z', seedKey: null }]);

    await runInstall({ api, specs: [BACKFILL_SPEC], previousVersion: '2.3.0' });
    keysSet.length = 0;
    await runInstall({ api, specs: [BACKFILL_SPEC], previousVersion: '2.3.0' });

    expect(keysSet).toEqual([]);
  });
});
