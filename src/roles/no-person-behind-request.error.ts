// The request came from an API key or an app with nobody signed in behind it. Such a caller can
// never manage roles, so the routes answer it with a refusal.
export class NoPersonBehindRequestError extends Error {
  constructor() {
    super('Nobody is signed in behind this request.');
    this.name = 'NoPersonBehindRequestError';
  }
}
