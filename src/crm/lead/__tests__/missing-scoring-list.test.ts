import { describe, expect, it } from 'vitest';

import { leadEvent, makeFakeLeadStore } from 'src/crm/lead/__tests__/fakes/fake-lead-store';
import { readLeadRow } from 'src/crm/lead/lead-selection';
import { makeRunLeadTrigger } from 'src/crm/lead/run-lead-trigger';
import { makeReadLeadsById } from 'src/crm/lead/twenty-lead-api';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';
import { readWithScoringFields } from 'src/crm/lead/utils/read-with-scoring-fields.util';

const NOW = '2026-10-09T12:00:00.000Z';
const stage = (id: string, sequence: number, isWon = false): StageRow => ({
  id,
  name: id,
  sequence,
  isWon,
  fold: false,
  rottingThresholdDays: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  teamIds: [],
});
const STAGES = [stage('new', 1), stage('won', 70, true)];

// Twenty's answer to a query naming a field the object does not have.
const refuse = (field: string) => new Error(`Find crmLeads: Cannot query field "${field}" on type "CrmLead".`);
const names = (selection: string, field: string) => selection.split(/\s+/).includes(field);

describe('a lead read when staff removed the Language or Tags list', () => {
  it('reads again without the missing list', async () => {
    const selections: string[] = [];
    const rows = await readWithScoringFields(
      async (selection) => {
        selections.push(selection);
        if (names(selection, 'language')) {
          throw refuse('language');
        }
        return ['read'];
      },
      { withTeam: true },
    );

    expect(rows).toEqual(['read']);
    expect(selections).toHaveLength(2);
    expect(names(selections[1], 'tags')).toBe(true);
    expect(names(selections[1], 'language')).toBe(false);
  });

  it('leaves both lists out when both are missing', async () => {
    const selections: string[] = [];

    await readWithScoringFields(
      async (selection) => {
        selections.push(selection);
        if (names(selection, 'tags') || names(selection, 'language')) {
          throw new Error(`${refuse('tags').message}; ${refuse('language').message}`);
        }
        return [];
      },
      { withTeam: true },
    );

    expect([names(selections[1], 'tags'), names(selections[1], 'language')]).toEqual([false, false]);
  });

  it('passes on any other failure', async () => {
    await expect(
      readWithScoringFields(
        async () => {
          throw new Error('Find crmLeads: Rate limit exceeded');
        },
        { withTeam: true },
      ),
    ).rejects.toThrow('Rate limit exceeded');
  });

  it('still runs the lead rules: a lead dragged into the won stage is won', async () => {
    const before = readLeadRow({
      id: 'l1',
      createdAt: '2026-09-01T09:00:00.000Z',
      leadType: 'OPPORTUNITY',
      wonStatus: 'PENDING',
      stageId: 'new',
      probability: 40,
      automatedProbability: 40,
      updatedBy: { source: 'MANUAL', workspaceMemberId: 'm1' },
    });
    const after: LeadRow = { ...before, stageId: 'won' };
    const store = makeFakeLeadStore({ leads: [after], stages: STAGES, now: NOW });
    const readLeads = makeReadLeadsById(async (_filter, selection) => {
      if (names(selection, 'language')) {
        throw refuse('language');
      }
      return [...store.rows.values()] as unknown as Record<string, unknown>[];
    });

    await makeRunLeadTrigger({ ...store.triggerApi, readLeads })({
      operation: 'updated',
      events: [
        leadEvent({ recordId: 'l1', workspaceMemberId: 'm1', properties: { before, after, updatedFields: ['stage', 'stageId'] } }),
      ],
    });

    expect(store.rows.get('l1')).toMatchObject({ probability: 100, dateClosed: NOW, wonStatus: 'WON' });
  });
});
