import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, navigate, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import {
  SIMILAR_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  SIMILAR_LEADS_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { DataTable } from 'src/shared/front-components/data-table';
import { ClosablePanel, closePopUp, ErrorText, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';

type SimilarLead = { id: string; name: string | null; email: string | null; leadType: string | null; wonStatus: string | null };
type SimilarResult = { count: number; leads: SimilarLead[] };

const SimilarLeads = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const leadIds = useSelectedRecordIds();
  const { busy, error, call } = usePopUpCall(t('Could not look for similar leads.'));
  const [result, setResult] = useState<SimilarResult | null>(null);

  useRunOnce(() => {
    if (leadIds.length === 1) {
      void call<SimilarResult>(SIMILAR_LEADS_ROUTE_PATH, { leadId: leadIds[0] }).then(setResult);
    }
  });

  if (leadIds.length !== 1) {
    return <ClosablePanel message={null} error={t('Select one lead.')} busy={false} closeLabel={t('Close')} />;
  }

  const statusLabel = (status: string | null) => (status === 'WON' ? t('Won') : status === 'LOST' ? t('Lost') : t('Pending'));
  const title =
    result === null ? t('Similar leads') : result.count === 1 ? t('1 similar lead') : t('{count} similar leads', { count: result.count });

  return (
    <div className="platform-crm-similar" style={styles.panel}>
      <div style={styles.title}>{title}</div>
      {result === null && error === null && busy ? <div style={styles.muted}>{t('Loading…')}</div> : null}
      {result !== null && result.count > 0 ? (
        <DataTable
          rows={result.leads}
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
            { key: 'email', title: t('Email'), render: (row) => row.email ?? '' },
            { key: 'type', title: t('Type'), render: (row) => (row.leadType === 'OPPORTUNITY' ? t('Opportunity') : t('Lead')) },
            { key: 'status', title: t('Status'), render: (row) => statusLabel(row.wonStatus) },
          ]}
        />
      ) : null}
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" onClick={closePopUp}>
          {t('Close')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: SIMILAR_LEADS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'similar-leads',
  description: 'Lists leads that look like the selected one: same email domain, same customer company or same phone.',
  component: SimilarLeads,
});
