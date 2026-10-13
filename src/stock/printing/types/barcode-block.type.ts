export type BarcodeBlock = {
  kind: 'barcode';
  symbology: 'code128' | 'ean13' | 'ean8' | 'qrcode' | 'datamatrix';
  value: string;
  caption?: string;
  widthMm: number;
  heightMm: number;
};
