// A signature at the foot of a slip: the image (null when it could not be loaded) and the name of
// the contact who signed, empty when the transfer has none of its own.
export type SignatureBlock = { kind: 'signature'; png: Uint8Array | null; name: string };
