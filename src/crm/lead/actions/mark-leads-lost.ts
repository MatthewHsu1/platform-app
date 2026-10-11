import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { LeadActionError } from 'src/crm/lead/actions/lead-action-error';
import { readLeadsAsUser, updateLeadsAsUser } from 'src/crm/lead/actions/lead-action-route';
import { LOST_COMMENT_TITLE, planMarkLost } from 'src/crm/lead/actions/utils/plan-won-lost.util';
import { loadLeadContext } from 'src/crm/lead/load-lead-context';
import { type MarkLeadsLostStore } from 'src/crm/lead/types/mark-leads-lost-store.type';
import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { readUserLocale } from 'src/shared/i18n/read-user-locale';
import { translate } from 'src/shared/i18n/translate';
import { requireUpdateRights } from 'src/shared/object-rights';
import { addNotesWithIds } from 'src/shared/triggers/put-back';
import { derivedId } from 'src/shared/utils/derived-id.util';

// The closing note goes first, then the status, probability and reason as the
// clicking user (the save rules stamp the closed date), then the app's
// automated probability. Each note's id comes from the lead and the dialog's
// run, so a second click after a stopped run finds the notes it made and
// writes the rest again.
export const makeMarkLeadsLost =
  (store: MarkLeadsLostStore) =>
  async ({
    leadIds,
    lostReasonId,
    closingNote,
    runId,
  }: {
    leadIds: string[];
    lostReasonId: string | null;
    closingNote: string;
    runId: string;
  }) => {
    const leads = await store.readLeads(leadIds);
    const wonStageIds = new Set((await store.readStages()).filter((stage) => stage.isWon).map((stage) => stage.id));
    const plan = planMarkLost({
      leads: leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        wonStatus: lead.wonStatus,
        stageIsWon: lead.stageId !== null && wonStageIds.has(lead.stageId),
      })),
      lostReasonId,
    });

    if (plan.kind === 'refuse') {
      throw new LeadActionError(plan.reason, plan.values);
    }
    await store.requireUpdateRights();

    if (closingNote.length > 0) {
      const title = await store.noteTitle();

      await store.addNotes(
        leadIds.map((recordId) => ({ id: derivedId('lostComment', runId, recordId), recordId, title, body: closingNote })),
      );
    }
    await store.updateLeadsAsUser(leadIds, plan.userData);
    await store.writeLeadsAsApplication(leadIds, plan.appData);

    return { leadIds };
  };

export const markLeadsLost = makeMarkLeadsLost({
  readLeads: readLeadsAsUser,
  readStages: async () => (await loadLeadContext([])).stages,
  requireUpdateRights: () => requireUpdateRights([CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER]),
  noteTitle: async () => translate(await readUserLocale(), LOST_COMMENT_TITLE),
  addNotes: (items) => addNotesWithIds('crmLead', items),
  updateLeadsAsUser,
  writeLeadsAsApplication: async (leadIds, data) => {
    await writeLeadsAsApplication(leadIds.map((leadId) => ({ leadId, data })));
  },
});
