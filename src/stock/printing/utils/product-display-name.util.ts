// The name a product prints under: its internal reference in brackets, then its name.
export const productDisplayName = (name: string, defaultCode: string | null) =>
  defaultCode ? `[${defaultCode}] ${name}` : name;
