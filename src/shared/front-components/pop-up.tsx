import { useEffect, useRef, useState } from 'react';
import { closeSidePanel, enqueueSnackbar, unmountFrontComponent } from 'twenty-sdk/front-component';
import { Button } from 'twenty-ui/primitives/input';

import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { readPopUpStyles } from 'src/shared/front-components/pop-up-styles';

// The translation extractor reads only front-component files: these parts show the text their caller hands them.

export const closePopUp = () => {
  void unmountFrontComponent();
  void closeSidePanel();
};

export const finishWith = async (message: string) => {
  await enqueueSnackbar({ message, variant: 'success' });
  closePopUp();
};

// Work a pop-up does once when it opens. The ref keeps it to one run however
// often the effect fires.
export const useRunOnce = (run: () => void) => {
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      run();
    }
  }, [run]);
};

// One route call at a time, its error kept on screen: a thrown error would
// kill the component until the page reloads.
export const usePopUpCall = (fallbackError: string) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async <TResult,>(routePath: string, body: Record<string, unknown>): Promise<TResult | null> => {
    setBusy(true);
    setError(null);
    try {
      return await postAppRoute<TResult>(routePath, body);
    } catch (caught) {
      setError(describeRouteError(caught, fallbackError));
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, setError, call };
};

export const ErrorText = ({ error }: { error: string | null }) => {
  const styles = readPopUpStyles();

  return error === null ? null : <div style={styles.error}>{error}</div>;
};

// A message or an error, and a Close button: the wait while a route runs, a refusal, or "select all" (which hands
// a button no ids).
export const ClosablePanel = ({
  message,
  error,
  busy,
  closeLabel,
}: {
  message: string | null;
  error: string | null;
  busy: boolean;
  closeLabel: string;
}) => {
  const styles = readPopUpStyles();

  return (
    <div style={styles.panel}>
      {error === null ? <div>{message ?? ''}</div> : <ErrorText error={error} />}
      <div style={styles.buttons}>
        <Button size="sm" variant="outline" disabled={busy} onClick={closePopUp}>
          {closeLabel}
        </Button>
      </div>
    </div>
  );
};
