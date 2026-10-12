import { type TeamAllocation } from 'src/crm/assignment/types/team-allocation.type';
import { weightedPick } from 'src/crm/assignment/utils/weighted-pick.util';

// One lead per draw: teams whose filters overlap share the leads in
// proportion to their capacity. A team leaves the draw when its list is empty.
export const runAllocationLoop = async ({
  teams,
  random,
  allocate,
}: {
  teams: TeamAllocation[];
  random: () => number;
  allocate: (teamId: string, leadId: string) => Promise<{ done: string[] }>;
}) => {
  const lists = new Map(teams.map((team) => [team.teamId, [...team.leadIds]]));
  const population = teams.filter((team) => team.weight > 0).map(({ teamId, weight }) => ({ teamId, weight }));
  const done = new Set<string>();
  const allocations: { teamId: string; leadId: string }[] = [];

  while (population.length > 0) {
    const index = weightedPick(
      population.map((team) => team.weight),
      random,
    );
    const { teamId } = population[index];
    const remaining = (lists.get(teamId) ?? []).filter((leadId) => !done.has(leadId));

    lists.set(teamId, remaining);
    const [leadId] = remaining;

    if (leadId === undefined) {
      population.splice(index, 1);
      continue;
    }
    const outcome = await allocate(teamId, leadId);

    done.add(leadId);
    outcome.done.forEach((id) => done.add(id));
    allocations.push({ teamId, leadId });
  }
  return { allocations };
};
