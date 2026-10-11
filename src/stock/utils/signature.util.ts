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
  if (!Array.isArray(value)) {
    return null;
  }
  const strokes: SignaturePoint[][] = [];
  let points = 0;

  for (const stroke of value) {
    if (!Array.isArray(stroke)) {
      return null;
    }
    points += stroke.length;
    if (points > MAXIMUM_POINTS || !stroke.every(isPoint)) {
      return null;
    }
    if (stroke.length > 0) {
      strokes.push(stroke.map(([x, y]): SignaturePoint => [clamp(x, width), clamp(y, height)]));
    }
  }

  return points === 0 ? null : strokes;
};

export const signedSlipFileName = (pickingName: string) => `${pickingName}_signed_delivery_slip.pdf`;
