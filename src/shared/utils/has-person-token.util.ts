// A logic function holds the token of the user whose request started it. With nobody behind the
// run (a schedule, an install hook) Twenty hands it the app's own token in that place instead.
export const hasPersonToken = (env: Record<string, string | undefined> = process.env) => {
  const personToken = env.TWENTY_APP_ACCESS_TOKEN;

  return personToken !== undefined && personToken !== '' && personToken !== env.TWENTY_APP_APPLICATION_ACCESS_TOKEN;
};
