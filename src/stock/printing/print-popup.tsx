import { useState } from 'react';
import { useSelectedObjectMetadata, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { LinkList } from 'src/shared/front-components/link-list';
import { ClosablePanel, closePopUp, usePopUpCall, useRunOnce } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { checkSelection } from 'src/shared/front-components/selection-check';
import { printViewUrl } from 'src/stock/printing/print-view-url';
import { type PrintLink } from 'src/stock/printing/types/print-link.type';
import { type PrintReportKey } from 'src/stock/printing/types/print-report-key.type';
import { type PrintText } from 'src/stock/printing/types/print-text.type';
import { PRINT_ROUTE_PATH } from 'src/stock/stock-printing-universal-identifiers.constant';

// Asks for a print link at once and shows it: a front component cannot open a
// window by itself, the user clicks the link. Close closes the pop-up, or goes
// back to the report the print was started from.
export const PrintNow = ({
  report,
  text,
  options = {},
  recordIds,
  objectSingular,
  onClose = closePopUp,
}: {
  report: PrintReportKey;
  text: PrintText;
  options?: Record<string, unknown>;
  recordIds?: string[];
  objectSingular?: string;
  onClose?: () => void;
}) => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const selectedIds = useSelectedRecordIds();
  const selectedObject = useSelectedObjectMetadata()?.nameSingular;
  const ids = recordIds ?? selectedIds;
  const object = objectSingular ?? selectedObject ?? '';
  const { busy, error, call } = usePopUpCall(t(text.failed));
  const [links, setLinks] = useState<PrintLink[] | null>(null);

  useRunOnce(() => {
    if (ids.length > 0) {
      // Dates on the page print as the reader's calendar shows them.
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      void call<{ links: PrintLink[] }>(PRINT_ROUTE_PATH, { report, objectSingular: object, recordIds: ids, options, timeZone }).then(
        (result) => {
          if (result !== null) {
            setLinks(result.links);
          }
        },
      );
    }
  });

  const selectionMessage = checkSelection(ids.length, 'many');
  if (selectionMessage !== null) {
    return <ClosablePanel message={null} error={t(selectionMessage)} busy={false} closeLabel={t(text.close)} onClose={onClose} />;
  }
  if (links === null) {
    return (
      <ClosablePanel message={error === null ? t(text.printing) : null} error={error} busy={busy} closeLabel={t(text.close)} onClose={onClose} />
    );
  }

  return (
    <div style={styles.panel}>
      <LinkList title={t(text.ready)} links={links.map((link) => ({ name: t(text.open), url: printViewUrl(link.pass) }))} />
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" onClick={onClose}>
          {t(text.close)}
        </Button>
      </div>
    </div>
  );
};

export const makePrintPopup = (report: PrintReportKey, text: PrintText, options: Record<string, unknown> = {}) => {
  const PrintPopup = () => <PrintNow report={report} text={text} options={options} />;

  return PrintPopup;
};
