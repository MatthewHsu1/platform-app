import { writeLeadsAsApplication } from 'src/crm/lead/write-leads-as-application';
import { records } from 'src/shared/triggers/records';

const leads = records('crmLead', 'crmLeads');

// Opportunities made from a deleted case keep living without the link.
export const clearCaseFromLeads = async (caseIds: string[]) => {
  if (caseIds.length === 0) {
    return;
  }
  const linked = await leads.find<{ id: string }>({ ticketId: { in: caseIds } }, 'id');

  if (linked.length > 0) {
    await writeLeadsAsApplication(linked.map((lead) => ({ leadId: lead.id, data: { ticketId: null } })));
  }
};
