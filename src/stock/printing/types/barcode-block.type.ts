export type BarcodeBlock = {
  kind: 'barcode';
  symbology: 'code128' | 'ean13' | 'ean8' | 'upca' | 'qrcode' | 'datamatrix';
  value: string;
  caption?: string;
  widthMm: number;
  heightMm: number;
};
