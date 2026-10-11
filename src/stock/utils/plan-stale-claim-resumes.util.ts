// A claim key is "<action>:<recordId>"; a key with no resume entry point for its action is reported, not touched.
export const planStaleClaimResumes = ({
  claims,
  actions,
}: {
  claims: { key: string }[];
  actions: string[];
}) => {
  const known = new Set(actions);
  const resume: { key: string; action: string; recordId: string }[] = [];
  const unknown: string[] = [];

  for (const { key } of claims) {
    const separator = key.indexOf(':');
    const action = separator > 0 ? key.slice(0, separator) : '';
    const recordId = separator > 0 ? key.slice(separator + 1) : '';

    if (known.has(action) && recordId.length > 0) {
      resume.push({ key, action, recordId });
    } else {
      unknown.push(key);
    }
  }

  return { resume, unknown };
};
