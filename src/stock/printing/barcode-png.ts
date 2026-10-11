import bwipjs from 'bwip-js/node';

import { type BarcodeBlock } from 'src/stock/printing/types/barcode-block.type';
import { type BarcodePng } from 'src/stock/printing/types/barcode-png.type';

const ENCODER: Record<BarcodeBlock['symbology'], string> = {
  code128: 'code128',
  ean13: 'ean13',
  ean8: 'ean8',
  qrcode: 'qrcode',
  datamatrix: 'datamatrix',
};

const SQUARE: BarcodeBlock['symbology'][] = ['qrcode', 'datamatrix'];

// For the saved PDF: the file scales the image to the block's box, so only linear codes need a bar height.
export const barcodePng: BarcodePng = async (block) =>
  new Uint8Array(
    await bwipjs.toBuffer({
      bcid: ENCODER[block.symbology],
      text: block.value,
      scale: 3,
      ...(SQUARE.includes(block.symbology) ? {} : { height: block.heightMm }),
      includetext: false,
    }),
  );
