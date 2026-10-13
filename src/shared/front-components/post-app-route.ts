import { RestApiClient } from 'twenty-client-sdk/rest';

// The app's HTTP routes are served under /s.
export const postAppRoute = <TResult>(routePath: string, body: Record<string, unknown>) =>
  new RestApiClient().post<TResult>(`/s${routePath}`, body);
