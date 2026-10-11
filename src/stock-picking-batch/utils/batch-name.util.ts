// The next number split at its last "/" with the operation type code in
// between: BATCH/00001 on OUT gives BATCH/OUT/00001. A number with no "/"
// gives "<code>/<number>", and the sequence is reported as misconfigured.
export const batchName = ({ sequenceValue, typeSequenceCode }: { sequenceValue: string; typeSequenceCode: string }) => {
  const value = sequenceValue === '' ? '/' : sequenceValue;
  const cut = value.lastIndexOf('/');

  if (cut === -1) {
    return { name: `${typeSequenceCode}/${value}`, misconfigured: true };
  }
  return { name: `${value.slice(0, cut)}/${typeSequenceCode}/${value.slice(cut + 1)}`, misconfigured: false };
};
