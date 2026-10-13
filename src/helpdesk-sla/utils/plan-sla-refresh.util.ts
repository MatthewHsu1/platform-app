import { type SlaRow } from 'src/helpdesk-sla/types/sla-row.type';

// Refreshing keeps the rows whose policy still applies, removes the others, and adds a row for each policy
// that applies and has none.
export const planSlaRefresh = ({ rows, matching }: { rows: Pick<SlaRow, 'id' | 'slaId'>[]; matching: string[] }) => {
  const held = new Set(rows.map((row) => row.slaId));
  const wanted = new Set(matching);

  return {
    removeRowIds: rows.filter((row) => !wanted.has(row.slaId)).map((row) => row.id),
    addPolicyIds: [...wanted].filter((policyId) => !held.has(policyId)),
  };
};
