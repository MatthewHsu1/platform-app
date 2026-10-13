import { AppPath, Command, enqueueSnackbar, msg, navigate, t, useSelectedRecordIds } from 'twenty-sdk/front-component';

import { selectOneRecord } from 'src/shared/front-components/selection-check';
import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { STATUS_TARGETS_ROUTE_PATH } from 'src/stock/stock-reports-universal-identifiers.constant';
import { type StatusButton } from 'src/stock/utils/types/status-button.type';
import { type StatusTargetsAnswer } from 'src/stock/utils/types/status-targets-answer.type';

// The extractor reads only entry files: the Returns button lists these for the catalog.
export const STATUS_BUTTON_TEXTS = {
  nothing: msg('Nothing to show.'),
  several: msg('{count} records: see the tables on this page.'),
  failed: msg('Could not open the list.'),
};

// A headless button that opens the record it finds. Twenty cannot open a list
// of chosen records, so several only say how many there are.
export const makeStatusButton = (button: StatusButton) => {
  const StatusButtonCommand = () => {
    const { id: recordId, message: selectionMessage } = selectOneRecord(useSelectedRecordIds());

    const execute = async () => {
      if (recordId === null) {
        await enqueueSnackbar({ message: t(selectionMessage), variant: 'error' });
        return;
      }
      try {
        const { objectNameSingular, target } = await postAppRoute<StatusTargetsAnswer>(STATUS_TARGETS_ROUTE_PATH, { button, recordId });

        if (target.kind === 'none') {
          await enqueueSnackbar({ message: t(STATUS_BUTTON_TEXTS.nothing), variant: 'info' });
        } else if (target.kind === 'record') {
          await navigate(AppPath.RecordShowPage, { objectNameSingular, objectRecordId: target.id });
        } else {
          await enqueueSnackbar({ message: t(STATUS_BUTTON_TEXTS.several, { count: target.ids.length }), variant: 'info' });
        }
      } catch (error) {
        await enqueueSnackbar({ message: describeRouteError(error, t(STATUS_BUTTON_TEXTS.failed)), variant: 'error' });
      }
    };

    return <Command execute={execute} />;
  };

  return StatusButtonCommand;
};
