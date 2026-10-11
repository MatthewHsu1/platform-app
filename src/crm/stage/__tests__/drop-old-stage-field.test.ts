import { describe, expect, it } from 'vitest';

import { dropOldStageField } from 'src/crm/stage/drop-old-stage-field';
import { type PreInstallApi } from 'src/shared/install/types/pre-install-api.type';

const makeApi = (fields: { id: string; name: string; type: string }[]) => {
  const calls: string[] = [];
  const api: PreInstallApi = {
    findObject: async () => ({ id: 'o-lead', fields }),
    listViews: async () => [
      { id: 'v-pipeline', name: 'Pipeline', mainGroupByFieldMetadataId: 'f-stage' },
      { id: 'v-other', name: 'By status', mainGroupByFieldMetadataId: 'f-won' },
      { id: 'v-all', name: 'All Leads', mainGroupByFieldMetadataId: null },
    ],
    destroyView: async (id) => {
      calls.push(`destroy view ${id}`);
    },
    deactivateField: async (id) => {
      calls.push(`deactivate ${id}`);
    },
    deleteField: async (id) => {
      calls.push(`delete ${id}`);
    },
  };
  return { api, calls };
};

const SELECT_STAGE = [
  { id: 'f-stage', name: 'stage', type: 'SELECT' },
  { id: 'f-won', name: 'wonStatus', type: 'SELECT' },
];

describe('dropOldStageField', () => {
  it('removes the old stage list and the boards grouped by it when upgrading from before stages became records', async () => {
    const { api, calls } = makeApi(SELECT_STAGE);

    expect(await dropOldStageField({ api, previousVersion: '2.3.0' })).toBe('dropped');
    expect(calls).toEqual(['destroy view v-pipeline', 'deactivate f-stage', 'delete f-stage']);
  });

  it('does nothing on a fresh install', async () => {
    const { api, calls } = makeApi(SELECT_STAGE);

    expect(await dropOldStageField({ api, previousVersion: undefined })).toBe('skipped');
    expect(calls).toEqual([]);
  });

  it('does nothing on an upgrade from a version that already has stage records', async () => {
    const { api, calls } = makeApi(SELECT_STAGE);

    expect(await dropOldStageField({ api, previousVersion: '2.4.0-dev.2' })).toBe('skipped');
    expect(calls).toEqual([]);
  });

  it('does nothing when the stage is already a relation', async () => {
    const { api, calls } = makeApi([{ id: 'f-stage', name: 'stage', type: 'RELATION' }]);

    expect(await dropOldStageField({ api, previousVersion: '2.3.0' })).toBe('skipped');
    expect(calls).toEqual([]);
  });
});
