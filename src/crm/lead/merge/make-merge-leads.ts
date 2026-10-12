import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { LEADS_NOT_FOUND } from 'src/crm/lead/lead-messages.constant';
import { MERGE_LIMIT } from 'src/crm/lead/merge/merge-limit.constant';
import { MERGE_MESSAGES } from 'src/crm/lead/merge/merge-messages.constant';
import { mergeTexts } from 'src/crm/lead/merge/merge-texts';
import { type MergeApi } from 'src/crm/lead/merge/types/merge-api.type';
import { type MergeAttachment } from 'src/crm/lead/merge/types/merge-attachment.type';
import { type MergeAttachmentRename } from 'src/crm/lead/merge/types/merge-attachment-rename.type';
import { type MergeTexts } from 'src/crm/lead/merge/types/merge-texts.type';
import { planLeadMerge } from 'src/crm/lead/merge/utils/plan-lead-merge.util';
import { planMergeSummary } from 'src/crm/lead/merge/utils/plan-merge-summary.util';
import { planAttachmentName, planMovedNoteTitle } from 'src/crm/lead/merge/utils/plan-moved-names.util';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { toLeadInput } from 'src/crm/lead/utils/to-lead-input.util';
import { translate } from 'src/shared/i18n/translate';
import { type GraphqlCaller } from 'src/shared/twenty-graphql';
import { derivedId } from 'src/shared/utils/derived-id.util';

// The file names a moved attachment takes; a name already renamed by an
// earlier run is left out.
const attachmentRename = (attachment: MergeAttachment, tailName: string | null, texts: MergeTexts): MergeAttachmentRename => {
  const name = planAttachmentName({ name: attachment.name, tailName, texts });
  const files = attachment.files.map((file) => ({
    fileId: file.fileId,
    label: planAttachmentName({ name: file.label, tailName, texts }) ?? file.label,
  }));
  const filesChanged = files.some((file, index) => file.label !== attachment.files[index].label);

  return { ...(name === null ? {} : { name }), ...(filesChanged ? { files } : {}) };
};

// The steps run in this order: summary note, moves, the kept lead's values,
// then the trash. Each can run again after a stop: the summary note has an id
// derived from the merged leads, a title already prefixed and a file already
// renamed are left as they are, and moved rows are no longer on the
// merged-away lead.
export const makeMergeLeads =
  (api: MergeApi) =>
  async (
    leadIds: string[],
    {
      salespersonId,
      teamId,
      maxLength = MERGE_LIMIT,
      caller,
      locale: givenLocale,
    }: { salespersonId?: string | null; teamId?: string | null; maxLength?: number; caller: GraphqlCaller; locale?: string },
  ) => {
    const ids = [...new Set(leadIds)];

    if (ids.length < 2) {
      throw new LeadActionError(MERGE_MESSAGES.tooFew);
    }
    if (maxLength > 0 && ids.length > maxLength) {
      throw new LeadActionError(MERGE_MESSAGES.tooMany, { max: maxLength });
    }

    const leads = await api.readLeads(ids, caller);

    if (leads.length !== ids.length) {
      throw new LeadActionError(LEADS_NOT_FOUND, { count: ids.length - leads.length }, 404);
    }

    const context = await api.loadContext(leads);
    const plan = planLeadMerge({ leads, stages: context.stages, salespersonId, teamId });
    const tails = plan.tailIds
      .map((id) => leads.find((lead) => lead.id === id))
      .filter((lead): lead is LeadRow => lead !== undefined);

    await api.requireUpdateRight(caller);

    // A run with the app token passes the language of the person who started it.
    const locale = givenLocale ?? (await api.readLocale(caller));
    const label = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);
    const summary = planMergeSummary({ tails, names: await api.readNames(leads, context), label });

    await api.addNote({
      id: derivedId('leadMergeSummary', plan.headId, ...[...plan.tailIds].sort()),
      leadId: plan.headId,
      title: label(MERGE_MESSAGES.summaryTitle),
      body: summary,
    });

    const texts = mergeTexts(locale);

    for (const tail of tails) {
      // A note the kept lead already holds is its own: it keeps its title.
      const headNoteIds = new Set((await api.listNotesOf(plan.headId)).map((note) => note.noteId));

      for (const note of await api.listNotesOf(tail.id)) {
        if (headNoteIds.has(note.noteId)) {
          continue;
        }
        const title = planMovedNoteTitle({ tailName: tail.name, title: note.title, texts });

        if (title !== null) {
          await api.renameNote(note.noteId, title);
        }
      }
      await api.moveNoteLinks(tail.id, plan.headId);
      await api.moveTaskLinks(tail.id, plan.headId);

      for (const attachment of await api.listAttachmentsOf(tail.id)) {
        await api.moveAttachment(attachment.id, plan.headId, attachmentRename(attachment, tail.name, texts));
      }
    }

    await api.writeHead(plan.headId, toLeadInput(plan.data));
    await api.softDeleteLeads(plan.tailIds);

    return { headId: plan.headId, tailIds: plan.tailIds };
  };
