import { type NewRowRole } from 'src/stock/utils/types/new-row-role.type';
import { type FlowLocation } from 'src/stock/utils/types/flow-location.type';
import { type FlowPickingType } from 'src/stock/utils/types/flow-picking-type.type';
import { type FlowSequence } from 'src/stock/utils/types/flow-sequence.type';
import { type FlowWarehouse } from 'src/stock/utils/types/flow-warehouse.type';

export type WarehouseFlowsInput = {
  warehouse: FlowWarehouse;
  // The rows the warehouse fields point at, archived ones too.
  locations: FlowLocation[];
  // Locations staff made under the view location (archive and unarchive follow the warehouse).
  otherLocationsUnderView: { id: string; active: boolean }[];
  pickingTypes: FlowPickingType[];
  sequences: FlowSequence[];
  // Barcodes other locations hold, archived and trashed ones too.
  usedBarcodes: string[];
  usedSequenceNames: string[];
  maxTypeSequence: number;
  vendorsLocationId: string;
  customersLocationId: string;
  defaultCode: string;
  // The save changed the name or the code: sequences and the view location follow.
  renamed: boolean;
  // The save archived or unarchived the warehouse.
  activeChanged: boolean;
  // The warehouse the install makes: its types start without automatic
  // batches, which staff turn on when they want them.
  installWarehouse: boolean;
  newIds: Record<NewRowRole, string>;
};
