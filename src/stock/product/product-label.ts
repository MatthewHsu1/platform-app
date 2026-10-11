// A product as its lists show it: "[code] name" when it has an internal reference.
export const productLabel = (product: { displayName: string; defaultCode: string | null }) =>
  product.defaultCode === null ? product.displayName : `[${product.defaultCode}] ${product.displayName}`;
