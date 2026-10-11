export type BarcodeBlock = {
  kind: 'barcode';
  symbology: 'code128' | 'qrcode' | 'datamatrix';
  value: string;
  caption?: string;
  widthMm: number;
  heightMm: number;
};
