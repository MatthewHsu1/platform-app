import { defineFrontComponent } from 'twenty-sdk/define';
import { AppPath, Command, enqueueSnackbar, navigate, t } from 'twenty-sdk/front-component';

import { describeRouteError } from 'src/shared/describe-route-error';
import { postAppRoute } from 'src/shared/front-components/post-app-route';
import { ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS, ORDERPOINT_ROUTE_PATHS } from 'src/stock/stock-universal-identifiers.constant';

// Refreshes the suggestions first, then opens the list. Errors are caught: a
// thrown one leaves the command dead until reload.
const Replenishment = () => {
  const execute = async () => {
    try {
      const { viewId, filling } = await postAppRoute<{ viewId: string | null; filling: boolean }>(
        ORDERPOINT_ROUTE_PATHS.replenishment,
        {},
      );

      if (filling) {
        await enqueueSnackbar({
          message: t('The replenishment list is still filling. Refresh it in a few minutes to see every suggestion.'),
          variant: 'info',
        });
      }
      await navigate(AppPath.RecordIndexPage, { objectNamePlural: 'stockWarehouseOrderpoints' }, viewId === null ? undefined : { viewId });
    } catch (error) {
      await enqueueSnackbar({ message: describeRouteError(error, t('Could not refresh the replenishment list.')), variant: 'error' });
    }
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: ORDERPOINT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIERS.replenishment,
  name: 'stock-orderpoint-replenishment',
  description: 'Refreshes the replenishment suggestions and opens the Replenishment list.',
  isHeadless: true,
  component: Replenishment,
});
