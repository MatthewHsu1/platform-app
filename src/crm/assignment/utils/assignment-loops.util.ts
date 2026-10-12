import { type LoopLead } from 'src/crm/assignment/types/loop-lead.type';

// Most probable first; equal probabilities keep the order they came in.
const byProbability = (leads: LoopLead[]) =>
  leads
    .map((lead, position) => ({ lead, position }))
    .sort((left, right) => (right.lead.probability ?? 0) - (left.lead.probability ?? 0) || left.position - right.position)
    .map((entry) => entry.lead);

// Gives each lead to the first member, in the current turn order, whose filter
// takes it. A member who received a lead goes to the end of the turn order
// while quota is left. Leads that match a member's preferred filter go first,
// among those members only. A lead someone else took meanwhile is skipped and
// costs no quota.
export const runAssignmentLoops = async ({
  leads,
  members,
  quotas,
  eligible,
  preferred,
  assign,
}: {
  leads: LoopLead[];
  members: string[];
  quotas: ReadonlyMap<string, number>;
  eligible: ReadonlyMap<string, ReadonlySet<string>>;
  preferred: ReadonlyMap<string, ReadonlySet<string>>;
  assign: (leadId: string, membershipId: string) => Promise<boolean>;
}) => {
  const quotaLeft = new Map(quotas);
  const turn = [...members];
  const preferredTurn = members.filter((member) => preferred.has(member));
  const assigned = new Map<string, string[]>();
  const handled = new Set<string>();

  const tryAssign = async (lead: LoopLead, candidates: string[], sets: ReadonlyMap<string, ReadonlySet<string>>, inPreferredLoop: boolean) => {
    const member = candidates.find((candidate) => sets.get(candidate)?.has(lead.id) === true);

    if (member === undefined) {
      return;
    }
    handled.add(lead.id);

    if (!(await assign(lead.id, member))) {
      return;
    }
    assigned.set(member, [...(assigned.get(member) ?? []), lead.id]);
    const left = (quotaLeft.get(member) ?? 0) - 1;

    quotaLeft.set(member, left);
    const lists = inPreferredLoop ? [turn, preferredTurn] : [turn];

    for (const list of lists) {
      list.splice(list.indexOf(member), 1);

      if (left > 0) {
        list.push(member);
      }
    }
  };

  const preferredLeads = byProbability(
    members.filter((member) => preferred.has(member)).flatMap((member) => leads.filter((lead) => preferred.get(member)?.has(lead.id) === true)),
  );

  for (const lead of preferredLeads) {
    if (!handled.has(lead.id)) {
      await tryAssign(lead, preferredTurn, preferred, true);
    }
  }
  for (const lead of byProbability(leads.filter((lead) => !handled.has(lead.id)))) {
    await tryAssign(lead, turn, eligible, false);
  }
  return assigned;
};
