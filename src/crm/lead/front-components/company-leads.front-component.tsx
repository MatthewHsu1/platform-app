import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate, useRecordId, useTranslate } from 'twenty-sdk/front-component';

import { WON_STATUS } from 'src/crm/crm-options.constant';
import { CRM_SCREEN_IDS } from 'src/crm/screens-universal-identifiers.constant';
import { describeRouteError } from 'src/shared/describe-route-error';
import { DataTable } from 'src/shared/front-components/data-table';
import { ErrorText } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { QueryAsUserError, queryAsUser } from 'src/shared/front-components/query-as-user';

type CompanyLead = { id: string; name: string | null; wonStatus: string | null; stage: { name: string | null } | null };

// Leads of the company and of its people, every type, lost ones too.
const loadLeads = async (companyId: string): Promise<CompanyLead[]> => {
  const people = await queryAsUser<{ people: { edges: { node: { id: string } }[] } }>(
    `query People($companyId: UUID!) { people(filter: { companyId: { eq: $companyId } }, first: 200) { edges { node { id } } } }`,
    { companyId },
  );
  const personIds = people.people.edges.map(({ node }) => node.id);
  const filter = personIds.length === 0 ? { companyId: { eq: companyId } } : { or: [{ companyId: { eq: companyId } }, { personId: { in: personIds } }] };
  const leads = await queryAsUser<{ crmLeads: { edges: { node: CompanyLead }[] } }>(
    `query CompanyLeads($filter: CrmLeadFilterInput) {
      crmLeads(filter: $filter, first: 200, orderBy: [{ createdAt: DescNullsLast }]) { edges { node { id name wonStatus stage { name deletedAt } } } }
    }`,
    { filter },
  );

  return leads.crmLeads.edges.map(({ node }) => node);
};

const CompanyLeads = () => {
  const { t } = useTranslate();
  const companyId = useRecordId();
  const styles = readPopUpStyles();
  const [leads, setLeads] = useState<CompanyLead[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (companyId === null) {
      return;
    }
    loadLeads(companyId).then(setLeads, (caught: unknown) => {
      // A person without a Sales level may not read leads: the tab stays empty, as it is no error.
      if (!(caught instanceof QueryAsUserError && caught.isRefused)) {
        setError(describeRouteError(caught, t('Could not load the leads.')));
      }
    });
  }, [companyId, t]);

  const statusLabel = (status: string | null) => (status === WON_STATUS.WON ? t('Won') : status === WON_STATUS.LOST ? t('Lost') : t('Pending'));

  return (
    <div style={styles.panel}>
      <ErrorText error={error} />
      <DataTable
        rows={leads}
        rowKey={(row) => row.id}
        columns={[
          {
            key: 'name',
            title: t('Lead'),
            render: (row) => (
              <button
                type="button"
                style={styles.link}
                onClick={() => void navigate(AppPath.RecordShowPage, { objectNameSingular: 'crmLead', objectRecordId: row.id })}
              >
                {row.name ?? ''}
              </button>
            ),
          },
          { key: 'stage', title: t('Stage'), render: (row) => row.stage?.name ?? '' },
          { key: 'status', title: t('Status'), render: (row) => statusLabel(row.wonStatus) },
        ]}
      />
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: CRM_SCREEN_IDS.companyLeads,
  name: 'company-leads',
  description: 'Leads of the company and of its people.',
  component: CompanyLeads,
});
