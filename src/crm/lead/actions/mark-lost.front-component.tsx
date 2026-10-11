import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import {
  closeSidePanel,
  enqueueSnackbar,
  unmountFrontComponent,
  useRecordId,
} from 'twenty-sdk/front-component';
import { themeCssVariables } from 'twenty-ui/theme';

import { postLeadAction } from 'src/crm/lead/actions/lead-action-command';
import {
  MARK_LOST_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  MARK_LOST_ROUTE_PATH,
} from 'src/crm/lead/actions/lead-actions-universal-identifiers.constant';
import { describeRouteError } from 'src/shared/describe-route-error';

type LostReason = { id: string; name: string };

const loadActiveLostReasons = async (): Promise<LostReason[]> => {
  const response = await fetch(`${process.env.TWENTY_API_URL}/graphql`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.TWENTY_APP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      query: `{ crmLostReasons(filter: { active: { eq: true } }, orderBy: [{ name: AscNullsLast }], first: 200) {
        edges { node { id name } }
      } }`,
    }),
  });
  const body = (await response.json()) as {
    data?: { crmLostReasons: { edges: { node: LostReason }[] } };
  };

  return body.data?.crmLostReasons.edges.map(({ node }) => node) ?? [];
};

// The lost reason is optional.
const MarkLost = () => {
  const STYLES = {
    panel: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
    },
    title: { fontWeight: 600, marginBottom: '4px' },
    button: {
      textAlign: 'left' as const,
      padding: '8px 12px',
      border: `1px solid ${themeCssVariables.border.color.medium}`,
      borderRadius: '6px',
      background: themeCssVariables.background.primary,
      font: 'inherit',
      cursor: 'pointer',
    },
  };

  const recordId = useRecordId();
  const [reasons, setReasons] = useState<LostReason[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadActiveLostReasons()
      .then(setReasons)
      .catch(() => setReasons([]));
  }, []);

  const close = () => {
    void unmountFrontComponent();
    void closeSidePanel();
  };

  const markLost = async (lostReasonId: string | null) => {
    if (recordId === null) {
      await enqueueSnackbar({ message: 'Open one lead first.', variant: 'error' });
      return;
    }

    setIsSaving(true);

    try {
      await postLeadAction(MARK_LOST_ROUTE_PATH, { leadId: recordId, lostReasonId });
      await enqueueSnackbar({ message: 'Lead marked lost.', variant: 'success' });
      close();
    } catch (error) {
      await enqueueSnackbar({
        message: describeRouteError(error, 'Could not mark the lead lost.'),
        variant: 'error',
      });
      setIsSaving(false);
    }
  };

  return (
    <div style={STYLES.panel}>
      <div style={STYLES.title}>Why was this lead lost?</div>
      {reasons === null ? (
        <div>Loading…</div>
      ) : (
        reasons.map((reason) => (
          <button
            key={reason.id}
            type="button"
            style={STYLES.button}
            disabled={isSaving}
            onClick={() => void markLost(reason.id)}
          >
            {reason.name}
          </button>
        ))
      )}
      <button
        type="button"
        style={STYLES.button}
        disabled={isSaving}
        onClick={() => void markLost(null)}
      >
        No reason
      </button>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: MARK_LOST_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'mark-lead-lost',
  description: 'Asks why the open lead was lost, then marks it lost.',
  component: MarkLost,
});
