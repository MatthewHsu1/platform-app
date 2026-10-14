import { type FieldserviceSettings } from 'src/fieldservice/types/fieldservice-settings.type';
import { readApplicationVariable } from 'src/shared/application-variables/read-application-variable';
import { readLiveApplicationVariables } from 'src/shared/application-variables/read-live-application-variables';

const readHours = (value: string | undefined, fallback: number) => {
  const hours = value === undefined || value === '' ? Number.NaN : Number(value);

  return Number.isFinite(hours) ? hours : fallback;
};

// The saved values, read from Twenty: a trigger runs in the worker, whose copy of the variables can lag behind a
// save. If that read fails, the values the run was started with stand in.
export const readFieldserviceSettings = async (): Promise<FieldserviceSettings> => {
  const live = await readLiveApplicationVariables().catch(() => null);
  const read = async (key: string) => (live === null ? readApplicationVariable(key) : live.get(key));

  return {
    hoursByPriority: [
      readHours(await read('FSM_ORDER_REQUEST_LATE_LOWEST'), 72),
      readHours(await read('FSM_ORDER_REQUEST_LATE_LOW'), 48),
      readHours(await read('FSM_ORDER_REQUEST_LATE_MEDIUM'), 24),
      readHours(await read('FSM_ORDER_REQUEST_LATE_HIGH'), 8),
    ],
    autoPopulateEquipmentsOnOrder: (await read('FSM_AUTO_POPULATE_EQUIPMENTS_ON_ORDER')) === 'true',
  };
};
