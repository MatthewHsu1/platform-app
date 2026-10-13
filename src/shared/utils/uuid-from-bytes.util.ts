// The first 16 bytes as a UUID of the given version (RFC 4122 layout). No
// Node import, so front components can use it too.
export const uuidFromBytes = (bytes: Uint8Array, version: 4 | 5) => {
  const octets = Array.from(bytes.subarray(0, 16));

  octets[6] = (octets[6] & 0x0f) | (version << 4);
  octets[8] = (octets[8] & 0x3f) | 0x80;
  const hex = octets.map((octet) => octet.toString(16).padStart(2, '0')).join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};
