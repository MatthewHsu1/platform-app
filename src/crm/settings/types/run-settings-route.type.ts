// Posts to a route from the settings page and shows its answer; onSuccess runs after a 200.
export type RunSettingsRoute = (
  path: string,
  body: Record<string, unknown>,
  done: (result: Record<string, unknown>) => string,
  onSuccess?: () => void,
) => Promise<void>;
