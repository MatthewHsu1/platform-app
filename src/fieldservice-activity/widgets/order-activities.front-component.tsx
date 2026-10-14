import { useCallback, useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { type MessageDescriptor, msg, useRecordId, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import {
  ACTIVITY_CANCEL_ROUTE_PATH,
  ACTIVITY_DONE_ROUTE_PATH,
  FIELDSERVICE_ACTIVITY_PAGE_UNIVERSAL_IDENTIFIERS,
} from 'src/fieldservice-activity/fieldservice-activity-universal-identifiers.constant';
import { ACTIVITY_STATE } from 'src/fieldservice-activity/fieldservice-activity-options.constant';
import { describeRouteError } from 'src/shared/describe-route-error';
import { DataTable } from 'src/shared/front-components/data-table';
import { ErrorText } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { QueryAsUserError, queryAsUser } from 'src/shared/front-components/query-as-user';

type OrderActivity = {
  id: string;
  name: string | null;
  required: boolean | null;
  ref: string | null;
  state: string | null;
  completedOn: string | null;
  completedBy: { name: { firstName: string | null; lastName: string | null } | null } | null;
};

const STATE_TEXT: Record<string, MessageDescriptor> = {
  [ACTIVITY_STATE.TODO]: msg('To do'),
  [ACTIVITY_STATE.DONE]: msg('Completed'),
  [ACTIVITY_STATE.CANCEL]: msg('Cancelled'),
};

// The checklist of the order, read as the clicking user: a row their role or row rule hides is not listed.
const loadActivities = async (orderId: string): Promise<OrderActivity[]> => {
  const data = await queryAsUser<{ fsmActivities: { edges: { node: OrderActivity }[] } }>(
    `query OrderActivities($orderId: UUID!) {
      fsmActivities(filter: { fsmOrderId: { eq: $orderId } }, orderBy: [{ sequence: AscNullsLast }, { createdAt: AscNullsLast }], first: 200) {
        edges { node { id name required ref state completedOn completedBy { name { firstName lastName } } } }
      }
    }`,
    { orderId },
  );

  return data.fsmActivities.edges.map(({ node }) => node);
};

const OrderActivities = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const orderId = useRecordId();
  const [activities, setActivities] = useState<OrderActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (orderId === null) {
      return;
    }
    try {
      setActivities(await loadActivities(orderId));
    } catch (caught) {
      // A person whose role does not open the checklist sees it empty: that is no error.
      if (!(caught instanceof QueryAsUserError && caught.isRefused)) {
        setError(describeRouteError(caught, t('Could not load the activities.')));
      }
    }
  }, [orderId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  // One route call at a time; a refusal stays on screen, as a thrown error would kill the widget.
  const act = async (routePath: string, activityId: string, fallbackError: string) => {
    setBusy(true);
    setError(null);
    try {
      await postAppRoute(routePath, { recordIds: [activityId] });
    } catch (caught) {
      setError(describeRouteError(caught, fallbackError));
    }
    await load();
    setBusy(false);
  };

  return (
    <div style={styles.panel}>
      <ErrorText error={error} />
      {activities.length === 0 ? <div style={styles.muted}>{t('No activities.')}</div> : null}
      {activities.length === 0 ? null : (
        <DataTable<OrderActivity>
          rowKey={(row) => row.id}
          rows={activities}
          columns={[
            { key: 'name', title: t('Name'), render: (row) => `${row.name ?? ''}${row.required === true ? ' *' : ''}` },
            { key: 'ref', title: t('Reference'), render: (row) => row.ref ?? '' },
            {
              key: 'state',
              title: t('State'),
              render: (row) => (row.state !== null && STATE_TEXT[row.state] !== undefined ? t(STATE_TEXT[row.state]) : (row.state ?? '')),
            },
            { key: 'completedOn', title: t('Completed on'), render: (row) => (row.completedOn === null ? '' : new Date(row.completedOn).toLocaleString()) },
            {
              key: 'completedBy',
              title: t('Completed by'),
              render: (row) => [row.completedBy?.name?.firstName, row.completedBy?.name?.lastName].filter(Boolean).join(' '),
            },
            {
              key: 'actions',
              title: '',
              render: (row) =>
                row.state === ACTIVITY_STATE.TODO ? (
                  <div style={styles.row}>
                    <Button size="sm" variant="solid" disabled={busy} onClick={() => void act(ACTIVITY_DONE_ROUTE_PATH, row.id, t('Could not complete the activity.'))}>
                      {t('Complete')}
                    </Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void act(ACTIVITY_CANCEL_ROUTE_PATH, row.id, t('Could not cancel the activity.'))}>
                      {t('Cancel')}
                    </Button>
                  </div>
                ) : null,
            },
          ]}
        />
      )}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: FIELDSERVICE_ACTIVITY_PAGE_UNIVERSAL_IDENTIFIERS.orderFrontComponent,
  name: 'platform-fsm-order-activities',
  description: 'The checklist of a service order, with Complete and Cancel on each activity that is still to do.',
  component: OrderActivities,
});
