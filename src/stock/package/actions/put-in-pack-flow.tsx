import { useState } from 'react';
import { enqueueSnackbar, useSelectedObjectMetadata, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { checkSelection } from 'src/shared/front-components/selection-check';
import { randomId } from 'src/shared/utils/random-id.util';
import { textOrNull } from 'src/shared/utils/text-or-null.util';
import {
  PUT_IN_PACK_LINES_ROUTE_PATH,
  PUT_IN_PACK_PACKAGES_ROUTE_PATH,
} from 'src/stock/package/actions/package-actions-universal-identifiers.constant';
import { type PutInPackRouteResult } from 'src/stock/package/types/put-in-pack-route-result.type';
import { type PutInPackText } from 'src/stock/package/types/put-in-pack-text.type';
import { LinkList } from 'src/shared/front-components/link-list';
import { ClosablePanel, closePopUp, ErrorText, finishWith, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { printViewUrl } from 'src/stock/printing/print-view-url';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';
import { queryAsUser } from 'src/shared/front-components/query-as-user';
import { readStockStyles } from 'src/stock/stock-theme';
import { ChoiceSelect, FieldRow, PopupPanel } from 'src/stock/tracking-controls';

type AskDestination = Extract<PutInPackRouteResult, { kind: 'askDestination' }>;
type AskPackage = Extract<PutInPackRouteResult, { kind: 'askPackage' }>;
type Named = { id: string; label: string };

const nameOf = (node: { name: string | null; completeName?: string | null }) => textOrNull(node.completeName) ?? textOrNull(node.name) ?? '';

const loadLocations = async (ids: string[]): Promise<Named[]> => {
  const data = await queryAsUser<{ stockLocations: { edges: { node: { id: string; name: string | null; completeName: string | null } }[] } }>(
    `query PackDestinations($ids: [UUID!]) { stockLocations(filter: { id: { in: $ids } }, first: 200) { edges { node { id name completeName } } } }`,
    { ids },
  );
  const byId = new Map(data.stockLocations.edges.map(({ node }) => [node.id, nameOf(node)]));

  return ids.map((id) => ({ id, label: byId.get(id) ?? id }));
};

// The Put in Pack pop-ups. Given lines win over the selection: a batch hands
// the open lines of its transfers.
export const PutInPackFlow = ({ moveLineIds, text }: { moveLineIds?: string[]; text: PutInPackText }) => {
  const { t } = useTranslate();
  const styles = readStockStyles();
  const selectedIds = useSelectedRecordIds();
  const objectMetadata = useSelectedObjectMetadata();
  const { busy, error, setError, call } = usePopUpCall(t(text.failed));
  const [destinationAsk, setDestinationAsk] = useState<AskDestination | null>(null);
  const [packageAsk, setPackageAsk] = useState<AskPackage | null>(null);
  const [destinations, setDestinations] = useState<Named[]>([]);
  const [destinationId, setDestinationId] = useState('');
  const [packageTypeId, setPackageTypeId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [printouts, setPrintouts] = useState<PrintLink[]>([]);
  // One id per opening: a Confirm sent again after an error reuses the package the first one made.
  const [runId] = useState(randomId);

  const isPackages = moveLineIds === undefined && objectMetadata?.nameSingular === 'stockPackage';
  const baseBody =
    moveLineIds !== undefined
      ? { lineIds: moveLineIds }
      : objectMetadata?.nameSingular === 'stockPicking'
        ? { pickingId: selectedIds[0] }
        : isPackages
          ? { packageIds: selectedIds }
          : { lineIds: selectedIds };
  const selectionMessage = moveLineIds === undefined ? checkSelection(selectedIds.length, 'many') : null;

  const run = async (extra: Record<string, unknown>) => {
    const result = await call<PutInPackRouteResult>(isPackages ? PUT_IN_PACK_PACKAGES_ROUTE_PATH : PUT_IN_PACK_LINES_ROUTE_PATH, {
      ...baseBody,
      ...extra,
      runId,
      // Dates on the package label show as the user's calendar shows them.
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    if (result === null) {
      return;
    }
    if (result.kind === 'packed') {
      if (result.printouts.length === 0) {
        await finishWith(t(text.packed));
        return;
      }
      // The pop-up stays open for the label to open.
      await enqueueSnackbar({ message: t(text.packed), variant: 'success' });
      setDestinationAsk(null);
      setPackageAsk(null);
      setPrintouts(result.printouts);
      return;
    }
    try {
      if (result.kind === 'askDestination') {
        const found = await loadLocations(result.locationDestIds);

        setDestinations(found);
        setDestinationId(found[0]?.id ?? '');
        setPackageAsk(null);
        setDestinationAsk(result);
        return;
      }
      setDestinationAsk(null);
      setPackageId('');
      setPackageAsk(result);
    } catch {
      setError(t(text.choicesUnread));
    }
  };

  useRunOnce(() => {
    if (selectionMessage === null) {
      void run({});
    }
  });

  if (selectionMessage !== null) {
    return (
      <ClosablePanel
        message={null}
        error={t(selectionMessage)}
        busy={false}
        closeLabel={t(text.close)}
      />
    );
  }
  if (printouts.length > 0) {
    return (
      <div style={styles.panel}>
        <LinkList
          title={t(text.printoutsTitle)}
          links={printouts.map((link) => {
            const name = text.printNames[link.report];

            return { name: name === undefined ? link.report : t(name), url: printViewUrl(link.pass) };
          })}
        />
        <div style={styles.buttons}>
          <Button size="sm" variant="outline" onClick={closePopUp}>
            {t(text.close)}
          </Button>
        </div>
      </div>
    );
  }
  if (destinationAsk !== null) {
    return (
      <PopupPanel title={t(text.destinationTitle)}>
        <div>{t(text.destinationExplanation)}</div>
        <FieldRow label={t(text.destinationLabel)}>
          <ChoiceSelect
            value={destinationId}
            onChange={setDestinationId}
            options={destinations.map((location) => ({ value: location.id, label: location.label }))}
          />
        </FieldRow>
        <ErrorText error={error} />
        <div style={styles.buttons}>
          <Button
            size="sm"
            variant="solid"
            color="accent"
            disabled={busy || destinationId === ''}
            onClick={() => void run({ locationDestId: destinationId, destinationLineIds: destinationAsk.lineIds })}
          >
            {t(text.confirm)}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
            {t(text.discard)}
          </Button>
        </div>
      </PopupPanel>
    );
  }
  if (packageAsk !== null) {
    const choices = packageAsk.choices.filter((choice) => packageTypeId === '' || choice.packageTypeId === packageTypeId);
    // A chosen package stays chosen unless the type set now is not its type.
    const chooseType = (typeId: string) => {
      const chosen = packageAsk.choices.find((choice) => choice.id === packageId);

      setPackageTypeId(typeId);
      if (typeId !== '' && chosen !== undefined && chosen.packageTypeId !== typeId) {
        setPackageId('');
      }
    };

    return (
      <PopupPanel title={t(text.packageTitle)}>
        <FieldRow label={t(text.packageTypeLabel)}>
          <ChoiceSelect
            value={packageTypeId}
            onChange={chooseType}
            options={[{ value: '', label: t(text.noPackageType) }, ...packageAsk.packageTypes.map((type) => ({ value: type.id, label: type.label }))]}
          />
        </FieldRow>
        <FieldRow label={t(text.packageLabel)}>
          <ChoiceSelect
            value={packageId}
            onChange={setPackageId}
            options={[{ value: '', label: t(text.newPackage) }, ...choices.map((pack) => ({ value: pack.id, label: pack.label }))]}
          />
        </FieldRow>
        <ErrorText error={error} />
        <div style={styles.buttons}>
          <Button
            size="sm"
            variant="solid"
            color="accent"
            disabled={busy}
            onClick={() =>
              void run({
                fromPackageWizard: true,
                packageId: packageId === '' ? null : packageId,
                packageTypeId: packageTypeId === '' ? null : packageTypeId,
              })
            }
          >
            {t(text.confirm)}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
            {t(text.discard)}
          </Button>
        </div>
      </PopupPanel>
    );
  }

  return <ClosablePanel message={busy ? t(text.packing) : null} error={error} busy={busy} closeLabel={t(text.close)} />;
};
