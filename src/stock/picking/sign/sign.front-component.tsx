import { type PointerEvent, useRef, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, useSelectedRecordIds, useTranslate } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';
import { themeCssVariables } from 'twenty-ui/theme';

import { LinkList } from 'src/shared/front-components/link-list';
import { ClosablePanel, closePopUp, ErrorText, usePopUpCall } from 'src/shared/front-components/pop-up';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';
import { type LinkItem } from 'src/shared/front-components/types/link-item.type';
import { SIGNATURE_PAD } from 'src/stock/picking/sign/signature-pad.constant';
import { SIGN_ROUTE_PATH, SIGNATURE_UNIVERSAL_IDENTIFIERS } from 'src/stock/stock-printing-universal-identifiers.constant';
import { type SignaturePoint } from 'src/stock/utils/types/signature-point.type';

const SIGN_TEXT = {
  title: msg('Sign'),
  clear: msg('Clear'),
  sign: msg('Sign'),
  cancel: msg('Cancel'),
  close: msg('Close'),
  failed: msg('Could not save the signature.'),
  drawFirst: msg('Draw the signature before you sign.'),
  signed: msg('Signed. The signed delivery slip is saved on the transfer.'),
  selectOne: msg('Select one delivery to sign.'),
};

// The sign route answers these texts in the user's language. The translation
// extractor reads only front-component files, so they are listed here to reach
// the catalog; each must match its source text exactly.
export const SIGN_ROUTE_TEXTS = [
  msg('Draw the signature before you sign.'),
  msg('Transfer not found.'),
  msg('Only deliveries can be signed.'),
  msg('This transfer is already signed.'),
  msg('Your time zone is not known. Check the time zone in your settings and sign again.'),
  msg('Order signed by {partner}'),
  msg('Order signed'),
];

const pathOf = (points: SignaturePoint[]) => points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
const tenths = (value: number) => Math.round(value * 10) / 10;

// Drawn as SVG paths: a canvas draws nothing inside a front component.
const SignPad = () => {
  const { t } = useTranslate();
  const styles = readPopUpStyles();
  const selectedIds = useSelectedRecordIds();
  const padRef = useRef<SVGSVGElement>(null);
  const isDrawing = useRef(false);
  const [strokes, setStrokes] = useState<SignaturePoint[][]>([]);
  const [files, setFiles] = useState<LinkItem[] | null>(null);
  const { busy, error, setError, call } = usePopUpCall(t(SIGN_TEXT.failed));

  if (selectedIds.length !== 1) {
    return <ClosablePanel message={null} error={t(SIGN_TEXT.selectOne)} busy={false} closeLabel={t(SIGN_TEXT.close)} />;
  }

  const point = (event: PointerEvent): SignaturePoint => {
    const box = (padRef.current as unknown as Element).getBoundingClientRect();

    return [tenths(event.clientX - box.left), tenths(event.clientY - box.top)];
  };
  // Moves outside the pad never arrive, and neither does a release there, so leaving the pad ends
  // the stroke as a release does.
  const endStroke = () => {
    isDrawing.current = false;
  };

  const sign = async () => {
    if (strokes.length === 0) {
      setError(t(SIGN_TEXT.drawFirst));
      return;
    }
    // Dates on the signed slip read as the signer's calendar shows them.
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const result = await call<{ files: LinkItem[] }>(SIGN_ROUTE_PATH, { pickingId: selectedIds[0], strokes, timeZone });

    if (result !== null) {
      setFiles(result.files);
    }
  };

  if (files !== null) {
    return (
      <div style={styles.panel}>
        <LinkList title={t(SIGN_TEXT.signed)} links={files} />
        <div style={styles.buttons}>
          <Button size="sm" variant="outline" onClick={closePopUp}>
            {t(SIGN_TEXT.close)}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>{t(SIGN_TEXT.title)}</div>
      <svg
        ref={padRef}
        width={SIGNATURE_PAD.width}
        height={SIGNATURE_PAD.height}
        style={{
          border: `1px solid ${themeCssVariables.border.color.medium}`,
          borderRadius: themeCssVariables.border.radius.sm,
          touchAction: 'none',
          background: 'white',
          cursor: 'crosshair',
        }}
        onPointerDown={(event) => {
          isDrawing.current = true;
          setStrokes((current) => [...current, [point(event)]]);
        }}
        onPointerMove={(event) => {
          if (isDrawing.current) {
            const next = point(event);

            setStrokes((current) => current.map((stroke, index) => (index === current.length - 1 ? [...stroke, next] : stroke)));
          }
        }}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
      >
        <rect width={SIGNATURE_PAD.width} height={SIGNATURE_PAD.height} fill="white" />
        {strokes.map((stroke, index) => (
          <path key={index} d={pathOf(stroke)} fill="none" stroke="black" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
      <ErrorText error={error} />
      <div style={styles.buttons}>
        <Button size="sm" variant="ghost" disabled={busy} onClick={closePopUp}>
          {t(SIGN_TEXT.cancel)}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setStrokes([])}>
          {t(SIGN_TEXT.clear)}
        </Button>
        <Button size="sm" variant="solid" color="accent" disabled={busy} onClick={() => void sign()}>
          {t(SIGN_TEXT.sign)}
        </Button>
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: SIGNATURE_UNIVERSAL_IDENTIFIERS.frontComponent,
  name: 'platform-stock-picking-sign',
  description: 'Signature pad for a delivery: saves the signature and the signed delivery slip.',
  component: SignPad,
});
