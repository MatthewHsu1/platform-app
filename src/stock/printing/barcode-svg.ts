import bwipjs from 'bwip-js/node';

import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';

const ENCODER: Record<BarcodeBlock['symbology'], string> = {
  code128: 'code128',
  qrcode: 'qrcode',
  datamatrix: 'datamatrix',
};

// The page scales the drawing to the block's box; the bar height only matters for linear codes.
export const barcodeSvg = (block: BarcodeBlock) =>
  bwipjs.toSVG({
    bcid: ENCODER[block.symbology],
    text: block.value,
    ...(block.symbology === 'code128' ? { height: block.heightMm } : {}),
    includetext: false,
  });
