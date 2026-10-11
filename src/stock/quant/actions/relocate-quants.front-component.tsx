import { useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { Trans, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button, Input } from 'twenty-ui/primitives/input';

import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readQuantViewsAsUser } from 'src/stock/quant/actions/count-panels';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import { queryAsUser } from 'src/stock/stock-front-graphql';
import { readStockStyles } from 'src/stock/stock-theme';
import {
  RELOCATE_QUANTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  RELOCATE_QUANTS_ROUTE_PATH,
} from 'src/stock/stock-universal-identifiers.constant';
import { relocateRefusal } from 'src/stock/utils/plan-relocate-moves.util';

type LocationOption = { id: string; completeName: string | null; name: string | null };

// The destination package of the relocation pop-up comes with packages.
const RelocateQuants = () => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const selectedIds = useSelectedRecordIds();
  const { busy, error, setError, call } = usePopUpCall(t('The stock could not be relocated.'));
  const [refused, setRefused] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [destinationId, setDestinationId] = useState('');
  const [reason, setReason] = useState('');

  useRunOnce(() => {
    const load = async () => {
      const rows = await readQuantViewsAsUser(selectedIds);

      if (relocateRefusal(rows.map((row) => ({ quantity: row.onHand }))) !== null) {
        setRefused(true);
        return;
      }
      const data = await queryAsUser<{ stockLocations: { edges: { node: LocationOption }[] } }>(
        `{
          stockLocations(filter: { usage: { eq: INTERNAL }, active: { eq: true } }, orderBy: [{ completeName: AscNullsLast }], first: 200) {
            edges { node { id completeName name } }
          }
        }`,
      );

      setLocations(data.stockLocations.edges.map(({ node }) => node));
    };

    if (selectedIds.length > 0) {
      load().catch(() => setError(t('The locations could not be read.')));
    }
  });

  const confirm = async () => {
    const result = await call(RELOCATE_QUANTS_ROUTE_PATH, {
      quantIds: selectedIds,
      destinationId: destinationId === '' ? null : destinationId,
      reason,
    });

    if (result !== null) {
      await finishWith(t('Stock relocated.'));
    }
  };

  if (selectedIds.length === 0) {
    return (
      <ClosablePanel
        message={null}
        error={t('Select all is not supported here. Tick the records you want instead.')}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }
  if (refused) {
    return (
      <ClosablePanel
        message={null}
        error={t('You can only move positive quantities stored in locations used by a single company per relocation.')}
        busy={false}
        closeLabel={t('Close')}
      />
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>
        <Trans>Relocate</Trans>
      </div>
      <select
        style={styles.select}
        title={t('Destination location')}
        value={destinationId}
        onChange={(event) => setDestinationId(event.target.value)}
      >
        <option value="">{t('Destination location')}</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {textOrNull(location.completeName) ?? location.name ?? ''}
          </option>
        ))}
      </select>
      <Input value={reason} placeholder={t('Reason for relocation')} onValueChange={setReason} />
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => void confirm()}>
          {t('Confirm')}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t('Discard')}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: RELOCATE_QUANTS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-quant-relocate',
  description: 'Moves the selected stock rows to another internal location.',
  component: RelocateQuants,
});
