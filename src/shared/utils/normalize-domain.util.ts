const SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:\/\//i;
const PATH_SEPARATOR = /[/\\?#]/;
const USER_INFO_PREFIX = /^.*@/;
const PORT_SUFFIX = /:\d+$/;

const toPunycodeHost = (host: string) => {
  try {
    return new URL(`https://${host}`).hostname;
  } catch {
    return host;
  }
};

// The domain Twenty stores in a company's website, so a search finds what the
// save stored: no scheme, path, user, port, leading "www." or trailing dot,
// lower case, an international name in its punycode spelling. Text that is no
// domain comes back as it is.
export const normalizeDomain = (rawDomain: string) => {
  const [pathless = ''] = rawDomain.trim().replace(SCHEME_PREFIX, '').split(PATH_SEPARATOR);
  const labels = pathless.replace(USER_INFO_PREFIX, '').replace(PORT_SUFFIX, '').toLowerCase().split('.');

  while (labels.length > 0 && labels[labels.length - 1] === '') {
    labels.pop();
  }
  while (labels[0] === 'www') {
    labels.shift();
  }

  return toPunycodeHost(labels.join('.'));
};
