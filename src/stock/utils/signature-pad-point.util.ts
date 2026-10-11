import { type SignaturePoint } from 'src/stock/utils/types/signature-point.type';

const tenths = (value: number) => Math.round(value * 10) / 10;

// A front component's element reports an empty box until the page has measured it, so a pointer
// event that arrives before that has no place on the pad.
export const padPoint = (
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
): SignaturePoint | null =>
  box.width === 0 || box.height === 0 ? null : [tenths(clientX - box.left), tenths(clientY - box.top)];
