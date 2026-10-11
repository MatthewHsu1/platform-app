import { LOCATION_USAGE } from 'src/stock/stock-options.constant';

// The locations at or under the warehouses' view locations, vendor locations left out.
export const warehouseLocationIds = (viewPaths: string[], locations: { id: string; parentPath: string | null; usage: string }[]) =>
  new Set(
    locations
      .filter(
        (location) =>
          location.usage !== LOCATION_USAGE.SUPPLIER &&
          location.parentPath !== null &&
          viewPaths.some((path) => location.parentPath?.startsWith(path) === true),
      )
      .map((location) => location.id),
  );
