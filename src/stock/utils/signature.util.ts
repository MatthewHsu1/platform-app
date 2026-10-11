import { translate } from 'src/shared/i18n/translate';
import { SIGN_MESSAGES } from 'src/stock/picking/sign/sign-messages.constant';
import { type SignaturePoint } from 'src/stock/utils/types/signature-point.type';

// A signature with more points than this is not a hand drawing.
const MAXIMUM_POINTS = 20000;

const pathData = (points: SignaturePoint[]) =>
  points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

export const signatureSvg = (strokes: SignaturePoint[][], width: number, height: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="white"/>` +
  strokes
    .filter((stroke) => stroke.length > 0)
    .map(
      (stroke) =>
        `<path d="${pathData(stroke)}" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('') +
  '</svg>';

const clamp = (value: number, maximum: number) => Math.min(Math.max(value, 0), maximum);

const isPoint = (value: unknown): value is SignaturePoint =>
  Array.isArray(value) && value.length === 2 && value.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate));

// The pad sends its strokes as points; the route draws the image from them itself rather than
// taking markup from the browser. A point a fast pointer put just outside the pad goes to its edge.
export const readSignatureStrokes = (value: unknown, width: number, height: number): SignaturePoint[][] | null => {
  if (!Array.isArray(value) || !value.every((stroke) => Array.isArray(stroke) && stroke.every(isPoint))) {
    return null;
  }
  const strokes = (value as SignaturePoint[][])
    .filter((stroke) => stroke.length > 0)
    .map((stroke) => stroke.map(([x, y]): SignaturePoint => [clamp(x, width), clamp(y, height)]));
  const points = strokes.reduce((sum, stroke) => sum + stroke.length, 0);

  return points === 0 || points > MAXIMUM_POINTS ? null : strokes;
};

// The note names the transfer's own contact; no locale gives the English text.
export const orderSignedNote = (partnerName: string, locale: string | null = null) =>
  partnerName
    ? translate(locale, SIGN_MESSAGES.orderSignedBy, { partner: partnerName })
    : translate(locale, SIGN_MESSAGES.orderSigned);

export const signedSlipFileName = (pickingName: string) => `${pickingName}_signed_delivery_slip.pdf`;
