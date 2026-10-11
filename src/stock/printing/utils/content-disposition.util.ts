// A quoted file name allows printable ASCII only; a quote or backslash would end
// or escape it, and browsers drop everything before a slash.
const UNSAFE_FILE_NAME_CHARACTERS = /["\\/]|[^\x20-\x7E]/g;

export const attachmentDisposition = (fileName: string) =>
  `attachment; filename="${fileName.replace(UNSAFE_FILE_NAME_CHARACTERS, '_')}"`;
