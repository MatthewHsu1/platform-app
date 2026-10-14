import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import {
  CLOSE_CASE_ROUTE_PATH,
  HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS,
} from 'src/helpdesk-fieldservice/helpdesk-fieldservice-universal-identifiers.constant';
import { isOrderClosed } from 'src/helpdesk-fieldservice/utils/plan-case-close-guard.util';
import { planCloseOffer } from 'src/helpdesk-fieldservice/utils/plan-close-offer.util';
import { ChoiceSelect } from 'src/shared/front-components/choice-select';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { selectOneRecord } from 'src/shared/front-components/selection-check';

type StageChoice = { id: string; name: string | null; sequence: number | null };

type Loaded = {
  caseName: string | null;
  refusal: string | null;
  resolution: string;
  stages: StageChoice[];
};

const NO_STAGE = '';

type OrderQuery = {
  fsmOrders: {
    edges: {
      node: {
        closedStatus: string | null;
        resolution: { markdown: string | null } | null;
        ticket: {
          name: string | null;
          stage: { closed: boolean | null } | null;
          fsmOrders: { edges: { node: { closedStatus: string | null } }[] };
        } | null;
      };
    }[];
  };
  helpdeskTicketStages: { edges: { node: StageChoice }[] };
};

// What the pop-up shows: the order, its case with the closed status of the case's orders, and the stages. The
// reads are the clicking user's; the route checks again with every order of the case.
const load = async (orderId: string): Promise<Loaded> => {
  const data = await queryAsUser<OrderQuery>(
    `query CloseCaseDialog($id: UUID!) {
      fsmOrders(filter: { id: { eq: $id } }, first: 1) {
        edges { node {
          closedStatus resolution { markdown }
          ticket { name stage { closed } fsmOrders(first: 200) { edges { node { closedStatus } } } }
        } }
      }
      helpdeskTicketStages(filter: { active: { eq: true } }, orderBy: [{ sequence: AscNullsLast }], first: 200) {
        edges { node { id name sequence } }
      }
    }`,
    { id: orderId },
  );
  const order = data.fsmOrders.edges[0]?.node;
  const ticket = order?.ticket ?? null;
  const resolution = order?.resolution?.markdown ?? '';
  const offer = planCloseOffer({
    orderClosed: isOrderClosed(order?.closedStatus ?? null),
    orderResolution: resolution === '' ? null : resolution,
    workCase:
      ticket === null
        ? null
        : { stageClosed: ticket.stage?.closed === true, orderClosedStatuses: ticket.fsmOrders.edges.map((edge) => edge.node.closedStatus) },
  });

  return {
    caseName: ticket?.name ?? null,
    refusal: offer.kind === 'refuse' ? offer.reason : null,
    resolution: offer.kind === 'offer' ? (offer.resolution ?? '') : '',
    stages: data.helpdeskTicketStages.edges.map((edge) => edge.node),
  };
};

// Asks for the stage and the resolution of the work case whose service orders are all closed, then closes it.
const CloseCase = () => {
  const { t } = useTranslate();
  const theme = themeCssVariables;
  const styles = readPopUpStyles();
  const { id: orderId, message: selectionMessage } = selectOneRecord(useSelectedRecordIds());
  const { busy, error, setError, call } = usePopUpCall(t('Could not close the work case.'));
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [stageId, setStageId] = useState(NO_STAGE);
  const [resolution, setResolution] = useState('');

  useRunOnce(() => {
    if (orderId !== null) {
      load(orderId)
        .then((result) => {
          setLoaded(result);
          setResolution(result.resolution);
        })
        .catch(() => setError(t('The work case could not be read.')));
    }
  });

  if (orderId === null) {
    return <ClosablePanel message={null} error={t(selectionMessage)} busy={false} closeLabel={t('Close')} />;
  }
  if (loaded === null || loaded.refusal !== null) {
    const panelError = loaded?.refusal === undefined || loaded.refusal === null ? error : t(loaded.refusal);

    return <ClosablePanel message={t('Reading the work case…')} error={panelError} busy={false} closeLabel={t('Close')} />;
  }

  const closeCase = async () => {
    const result = await call<{ caseId: string }>(CLOSE_CASE_ROUTE_PATH, { recordId: orderId, stageId: stageId === NO_STAGE ? null : stageId, resolution });

    if (result !== null) {
      await finishWith(t('Work case closed.'));
    }
  };

  return (
    <div className="platform-helpdesk-fieldservice-close-case" style={styles.panel}>
      <div style={styles.title}>{t('Close work case')}</div>
      <div>{t('All service orders of the work case {name} are closed. Close the work case?', { name: loaded.caseName ?? '' })}</div>
      <label style={styles.row}>
        <span>{t('Work case stage')}</span>
        <ChoiceSelect
          value={stageId}
          disabled={busy}
          options={[{ value: NO_STAGE, label: t('Choose a stage') }, ...loaded.stages.map((stage) => ({ value: stage.id, label: stage.name ?? '' }))]}
          onChange={setStageId}
        />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
        <span>{t('Work case resolution')}</span>
        <textarea
          value={resolution}
          rows={5}
          disabled={busy}
          onChange={(event) => setResolution(event.target.value)}
          style={{
            padding: theme.spacing[2],
            borderRadius: theme.border.radius.sm,
            border: `1px solid ${theme.border.color.medium}`,
            background: theme.background.transparent.lighter,
            color: theme.font.color.primary,
            fontFamily: theme.font.family,
            fontSize: theme.font.size.md,
            resize: 'vertical',
          }}
        />
      </label>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" disabled={busy} onClick={closePopUp}>
          {t('Cancel')}
        </Button>
        <Button size="sm" variant="solid" disabled={busy || stageId === NO_STAGE || resolution.trim() === ''} onClick={() => void closeCase()}>
          {t('Close work case')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: HELPDESK_FIELDSERVICE_ACTION_UNIVERSAL_IDENTIFIERS.closeCaseFrontComponent,
  name: 'close-work-case-after-service-orders',
  description: 'Asks for the stage and the resolution, then closes the work case of the completed service order.',
  component: CloseCase,
});
