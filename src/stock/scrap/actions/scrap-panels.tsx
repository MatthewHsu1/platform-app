import { RestApiClientError } from 'twenty-client-sdk/rest';
import { useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { ErrorText } from 'src/shared/front-components/pop-up';
import { type InsufficientQuantityText } from 'src/stock/scrap/types/insufficient-quantity-text.type';
import { type ScrapValidateAnswer } from 'src/stock/scrap/types/scrap-validate-answer.type';
import { readStockStyles } from 'src/stock/stock-theme';

// The translation extractor reads only front-component files: this panel shows the text its caller hands it.

// The scrap a refused "Scrap" made and left a draft, named in the refusal so the pop-up retries it.
export const readRefusedScrapId = (error: unknown) => {
  if (!(error instanceof RestApiClientError)) {
    return null;
  }
  const body = error.body as { scrapId?: unknown } | undefined;

  return typeof body?.scrapId === 'string' ? body.scrapId : null;
};

// "Insufficient quantity to scrap": what is asked, where the product is in internal locations, then Confirm (scrap
// anyway) or Discard (drop the scrap).
export const InsufficientQuantityPanel = ({
  answer,
  text,
  busy,
  error,
  onConfirm,
  onDiscard,
}: {
  answer: Extract<ScrapValidateAnswer, { kind: 'needsAnswer' }>;
  text: InsufficientQuantityText;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onDiscard: () => void;
}) => {
  const { t } = useTranslate();
  const styles = readStockStyles();

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t(text.title)}</div>
      <div>
        {t(text.body, {
          location: answer.locationName,
          quantity: answer.quantity,
          unit: answer.unitName,
          product: answer.productName,
        })}
      </div>
      {answer.quants.length > 0 ? <div style={styles.title}>{t(text.currentStock)}</div> : null}
      {answer.quants.map((quant, index) => (
        <div key={`${quant.locationName}-${index}`} style={styles.row}>
          <span>{quant.locationName}</span>
          <span>{quant.quantity}</span>
        </div>
      ))}
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={onDiscard}>
          {t(text.discard)}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={onConfirm}>
          {t(text.confirm)}
        </Button>
      </div>
    </div>
  );
};
