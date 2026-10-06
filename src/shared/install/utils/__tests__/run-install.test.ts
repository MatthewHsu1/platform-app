import { describe, expect, it } from 'vitest';

import { type InstallObject, type ModuleInstallSpec } from 'src/shared/install/install-spec.type';
import { type InstallApi, runInstall } from 'src/shared/install/utils/run-install.util';

const LEAD = 'lead-universal-id';
const REASON = 'reason-universal-id';

const SPEC: ModuleInstallSpec = {
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

const makeFakeApi = ({
  leadFields = [{ id: 'f-won', name: 'wonStatus' }],
  reasonNames = [],
  viewNames = [],
}: {
  leadFields?: { id: string; name: string }[];
  reasonNames?: string[];
  viewNames?: string[];
} = {}) => {
  const state = {
    leadFields: [...leadFields],
    reasonNames: [...reasonNames],
    viewNames: [...viewNames],
    createdFields: [] as CreatedField[],
    createdRecords: [] as { object: string; names: string[] }[],
    createdBoards: [] as CreatedBoard[],
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
  };

  return { api, state };
};

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
