import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { type MergeApi } from 'src/crm/lead/merge/types/merge-api.type';
import { queryLeads } from 'src/crm/lead/query-leads';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { readUserNames } from 'src/sales-team/member/read-user-names';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { requireUpdateRights } from 'src/shared/object-rights';
import { addNote } from 'src/shared/triggers/put-back';
import { findMany, records } from 'src/shared/triggers/records';

const notes = records('note', 'notes');
const noteTargets = records('noteTarget', 'noteTargets');
const taskTargets = records('taskTarget', 'taskTargets');
const attachments = records('attachment', 'attachments');
const leads = records('crmLead', 'crmLeads');

type Named = { id: string; name: string | null };

const idsOf = (rows: LeadRow[], pick: (lead: LeadRow) => string | null) => [
  ...new Set(rows.map(pick).filter((id): id is string => id !== null)),
];

const byId = (rows: Named[]) => Object.fromEntries(rows.map((row) => [row.id, row.name ?? '']));

// Moving links by id keeps each update under Twenty's limit of rows per write.
// A link to a note or task the kept lead already has would show it twice there,
// so that link is removed instead.
const moveTargets = async (targets: typeof noteTargets, linkedField: 'noteId' | 'taskId', fromLeadId: string, toLeadId: string) => {
  const [moving, present] = await Promise.all([
    targets.find<Record<string, string | null> & { id: string }>({ targetCrmLeadId: { eq: fromLeadId } }, `id ${linkedField}`),
    targets.find<Record<string, string | null>>({ targetCrmLeadId: { eq: toLeadId } }, linkedField),
  ]);
  const onKeptLead = new Set(present.map((row) => row[linkedField]));
  const doubled = moving.filter((row) => onKeptLead.has(row[linkedField]));

  await targets.destroyMany(doubled.map((row) => row.id));
  await targets.updateMany(
    moving.filter((row) => !onKeptLead.has(row[linkedField])).map((row) => row.id),
    { targetCrmLeadId: toLeadId },
  );
};

// Reads run with the caller's rights. The moves, the kept lead's values and the
// trash run with the app token: they touch notes, tasks and files the user may
// not own, and the merged-away leads go to the trash as part of the merge, so
// only the clicking user's right to change leads is checked first.
export const twentyMergeApi: MergeApi = {
  readLeads: (leadIds, caller) => queryLeads(caller, { id: { in: leadIds } }, { withScoringFields: true }),
  loadContext: (rows) => loadLeadContext(rows),
  readNames: async (rows, context) => {
    const found = await findMany<{
      teams: Named[];
      plans: Named[];
      lostReasons: Named[];
      campaigns: Named[];
      mediums: Named[];
      sources: Named[];
    }>({
      teams: { of: records('crmTeam', 'crmTeams'), filter: { id: { in: idsOf(rows, (lead) => lead.teamId) } }, selection: 'id name' },
      plans: {
        of: records('crmRecurringPlan', 'crmRecurringPlans'),
        filter: { id: { in: idsOf(rows, (lead) => lead.recurringPlanId) } },
        selection: 'id name',
      },
      lostReasons: {
        of: records('crmLostReason', 'crmLostReasons'),
        filter: { id: { in: idsOf(rows, (lead) => lead.lostReasonId) } },
        selection: 'id name',
      },
      campaigns: {
        of: records('utmCampaign', 'utmCampaigns'),
        filter: { id: { in: idsOf(rows, (lead) => lead.campaignId) } },
        selection: 'id name',
      },
      mediums: { of: records('utmMedium', 'utmMediums'), filter: { id: { in: idsOf(rows, (lead) => lead.mediumId) } }, selection: 'id name' },
      sources: { of: records('utmSource', 'utmSources'), filter: { id: { in: idsOf(rows, (lead) => lead.sourceId) } }, selection: 'id name' },
    });
    const members = await readUserNames(idsOf(rows, (lead) => lead.salespersonId));

    return {
      stages: Object.fromEntries(context.stages.map((stage) => [stage.id, stage.name])),
      teams: byId(found.teams),
      members: Object.fromEntries([...members].map(([id, name]) => [id, name ?? ''])),
      plans: byId(found.plans),
      lostReasons: byId(found.lostReasons),
      campaigns: byId(found.campaigns),
      mediums: byId(found.mediums),
      sources: byId(found.sources),
    };
  },
  readLocale: (caller) => (caller === 'person' ? readUserLocale() : Promise.resolve('en')),
  requireUpdateRight: async (caller) => {
    if (caller === 'person') {
      await requireUpdateRights([CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER]);
    }
  },
  addNote: ({ id, leadId, title, body }) => addNote({ objectSingular: 'crmLead', recordId: leadId, title, body, id }),
  listNotesOf: async (leadId) => {
    const targets = await noteTargets.find<{ noteId: string | null; note: { title: string | null; deletedAt: string | null } | null }>(
      { targetCrmLeadId: { eq: leadId } },
      'noteId note { title deletedAt }',
    );

    return targets.flatMap((target) =>
      target.noteId === null || target.note === null || target.note.deletedAt !== null
        ? []
        : [{ noteId: target.noteId, title: target.note.title }],
    );
  },
  renameNote: (noteId, title) => notes.update(noteId, { title }),
  moveNoteLinks: (fromLeadId, toLeadId) => moveTargets(noteTargets, 'noteId', fromLeadId, toLeadId),
  moveTaskLinks: (fromLeadId, toLeadId) => moveTargets(taskTargets, 'taskId', fromLeadId, toLeadId),
  listAttachmentsOf: async (leadId) =>
    (
      await attachments.find<{ id: string; name: string | null; file: { fileId: string; label: string | null }[] | null }>(
        { targetCrmLeadId: { eq: leadId } },
        'id name file { fileId label }',
      )
    ).map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      files: (attachment.file ?? []).map((file) => ({ fileId: file.fileId, label: file.label })),
    })),
  // The Files tab shows each file's own label, so the label is renamed with the attachment.
  moveAttachment: (attachmentId, toLeadId, rename) =>
    attachments.update(attachmentId, {
      targetCrmLeadId: toLeadId,
      ...(rename.name === undefined ? {} : { name: rename.name }),
      ...(rename.files === undefined ? {} : { file: rename.files }),
    }),
  writeHead: async (headId, data) => {
    const { skipped } = await writeLeadsAsApplication([{ leadId: headId, data }]);

    if (skipped.length > 0) {
      throw new Error(`The merged values were not written to lead ${headId}.`);
    }
  },
  softDeleteLeads: async (leadIds) => {
    await leads.softDeleteMany(leadIds);
  },
};
