import { type MergeApi } from 'src/crm/lead/merge/types/merge-api.type';
import { SAMPLE_STAGES } from 'src/crm/lead/merge/utils/__tests__/fixtures/lead-row.fixture';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';

type FakeNote = { id: string; title: string | null; body: string | null; leadIds: string[] };
type FakeAttachment = { id: string; name: string | null; leadId: string; files: { fileId: string; label: string | null }[] };

type FakeMergeState = {
  leads: Map<string, LeadRow & { deleted?: boolean }>;
  notes: FakeNote[];
  taskLinks: { taskId: string; leadId: string }[];
  attachments: FakeAttachment[];
  // The clicking user's rights on leads; the trash step runs with the app's.
  rights?: { update: boolean; delete: boolean };
};

// A store in memory. `failAt` makes the named call throw once, as a run cut by
// its timeout would stop there.
export const makeFakeMergeApi = (state: FakeMergeState, failAt: { step: keyof MergeApi | null }) => {
  const step = async (name: keyof MergeApi) => {
    if (failAt.step === name) {
      failAt.step = null;
      throw new Error(`stopped at ${name}`);
    }
  };

  const api: MergeApi = {
    readLeads: async (leadIds) =>
      leadIds.flatMap((id) => {
        const lead = state.leads.get(id);

        return lead === undefined || lead.deleted === true ? [] : [{ ...lead }];
      }),
    loadContext: async () => ({
      stages: SAMPLE_STAGES,
      recurringPlanMonths: new Map(),
      teams: [],
      memberships: [],
      people: new Map(),
      companies: new Map(),
    }),
    readNames: async () => ({ stages: {}, teams: {}, members: {}, plans: {}, lostReasons: {}, campaigns: {}, mediums: {}, sources: {} }),
    readLocale: async () => 'en',
    requireUpdateRight: async () => {
      if (state.rights?.update === false) {
        throw new Error('not allowed');
      }
    },
    addNote: async ({ id, leadId, title, body }) => {
      await step('addNote');
      if (!state.notes.some((note) => note.id === id)) {
        state.notes.push({ id, title, body, leadIds: [leadId] });
      }
    },
    listNotesOf: async (leadId) =>
      state.notes.filter((note) => note.leadIds.includes(leadId)).map((note) => ({ noteId: note.id, title: note.title })),
    renameNote: async (noteId, title) => {
      await step('renameNote');
      const note = state.notes.find((candidate) => candidate.id === noteId);

      if (note !== undefined) {
        note.title = title;
      }
    },
    moveNoteLinks: async (fromLeadId, toLeadId) => {
      await step('moveNoteLinks');
      state.notes.forEach((note) => {
        if (note.leadIds.includes(fromLeadId)) {
          note.leadIds = [...new Set(note.leadIds.map((leadId) => (leadId === fromLeadId ? toLeadId : leadId)))];
        }
      });
    },
    moveTaskLinks: async (fromLeadId, toLeadId) => {
      await step('moveTaskLinks');
      const onKeptLead = new Set(state.taskLinks.filter((link) => link.leadId === toLeadId).map((link) => link.taskId));

      state.taskLinks = state.taskLinks.flatMap((link) =>
        link.leadId !== fromLeadId ? [link] : onKeptLead.has(link.taskId) ? [] : [{ ...link, leadId: toLeadId }],
      );
    },
    listAttachmentsOf: async (leadId) =>
      state.attachments
        .filter((attachment) => attachment.leadId === leadId)
        .map(({ id, name, files }) => ({ id, name, files: files.map((file) => ({ ...file })) })),
    moveAttachment: async (attachmentId, toLeadId, rename) => {
      await step('moveAttachment');
      const attachment = state.attachments.find((candidate) => candidate.id === attachmentId);

      if (attachment !== undefined) {
        attachment.leadId = toLeadId;
        attachment.name = rename.name ?? attachment.name;
        attachment.files = rename.files ?? attachment.files;
      }
    },
    writeHead: async (headId, data) => {
      await step('writeHead');
      const head = state.leads.get(headId);

      if (head !== undefined) {
        Object.assign(head, data);
      }
    },
    softDeleteLeads: async (leadIds) => {
      await step('softDeleteLeads');
      leadIds.forEach((id) => {
        const lead = state.leads.get(id);

        if (lead !== undefined) {
          lead.deleted = true;
        }
      });
    },
  };

  return api;
};
