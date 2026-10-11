import bwipjs from 'bwip-js/node';

import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';

const ENCODER: Record<BarcodeBlock['symbology'], string> = {
  code128: 'code128',
  ean13: 'ean13',
  ean8: 'ean8',
  upca: 'upca',
  qrcode: 'qrcode',
  datamatrix: 'datamatrix',
};

const SQUARE: BarcodeBlock['symbology'][] = ['qrcode', 'datamatrix'];

// The page scales the drawing to the block's box; the bar height only matters for linear codes.
export const barcodeSvg = (block: BarcodeBlock) =>
  bwipjs.toSVG({
    bcid: ENCODER[block.symbology],
    text: block.value,
    ...(SQUARE.includes(block.symbology) ? {} : { height: block.heightMm }),
    includetext: false,
  });
