import { type AssignmentPlugAnswer } from 'src/crm/assignment/plug/types/assignment-plug-answer.type';
import { planAssignmentWrite } from 'src/crm/assignment/utils/plan-assignment-write.util';
import { type AppLeadWrite } from 'src/crm/lead/types/app-lead-write.type';
import { type LeadRow } from 'src/crm/lead/types/lead-row.type';
import { type StageRow } from 'src/crm/lead/types/stage-row.type';

// Platform writes what the plugin decided with its own guard: a lead that got
// a salesperson meanwhile is left alone.
const GUARD = { salespersonId: { is: 'NULL' } };

export const planPlugWrites = ({
  answer,
  leads,
  stages,
  now,
}: {
  answer: AssignmentPlugAnswer;
  leads: LeadRow[];
  stages: StageRow[];
  now: string;
}): { writes: AppLeadWrite[]; answeredIds: string[] } => {
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const writes: AppLeadWrite[] = [];

  for (const { leadId, teamId, salespersonId } of answer.assignments) {
    const lead = leadById.get(leadId);

    if (lead === undefined) {
      continue;
    }
    const teamChange = lead.teamId === teamId ? {} : { teamId };

    if (salespersonId === null) {
      if (lead.teamId !== teamId) {
        writes.push({ leadId, data: teamChange, guard: GUARD });
      }
      continue;
    }
    writes.push({
      leadId,
      data: { ...planAssignmentWrite({ lead: { ...lead, teamId }, salespersonId, stages, now }), ...teamChange },
      guard: GUARD,
    });
  }
  return { writes, answeredIds: answer.assignments.map((assignment) => assignment.leadId) };
};
