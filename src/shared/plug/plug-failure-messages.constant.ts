// Why a plug call failed. English source texts; the caller translates them.
export const PLUG_FAILURE_MESSAGES = {
  notTurnedOn: 'The plug point is not turned on.',
  noTarget: 'The plug point has no target.',
  badRoute: 'A plug point route must be a path such as /app-name/route.',
  badUrl: 'The plug point address is not a valid URL.',
  notHttps: 'An outside plug point address must use https.',
  timedOut: 'The plug point did not answer within {seconds} s.',
  unreachable: 'The plug point could not be reached: {detail}',
  badStatus: 'The plug point answered with HTTP {status}.',
  notJson: 'The plug point answer is not JSON.',
  mismatch: 'The plug point answer does not match the request.',
  invalid: 'The plug point answer is not valid: {reason}',
} as const;
