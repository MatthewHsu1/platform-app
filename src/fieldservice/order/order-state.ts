import { type OrderState } from 'src/fieldservice/types/order-state.type';
import { textOrNull } from 'src/shared/utils/text-or-null.util';

export const ORDER_SELECTION = `id name stage closedStatus priority teamId locationId locationDirections requestEarly requestLate
  personId scheduledDateStart scheduledDuration scheduledDateEnd dateStart dateEnd duration territoryId branchId districtId
  regionId templateId todo { markdown } updatedBy { source }`;

const text = (value: unknown) => (typeof value === 'string' ? textOrNull(value) : null);
const number = (value: unknown) => (typeof value === 'number' ? value : 0);
const markdown = (value: unknown) =>
  value !== null && typeof value === 'object' && 'markdown' in value ? text((value as { markdown: unknown }).markdown) : null;

// An order as a read or a database event holds it, empty text read as null so the two agree.
export const readOrderState = (node: Record<string, unknown>): OrderState => ({
  id: String(node.id),
  name: text(node.name),
  stage: text(node.stage),
  closedStatus: text(node.closedStatus),
  priority: text(node.priority),
  teamId: text(node.teamId),
  locationId: text(node.locationId),
  locationDirections: text(node.locationDirections),
  requestEarly: text(node.requestEarly),
  requestLate: text(node.requestLate),
  personId: text(node.personId),
  scheduledDateStart: text(node.scheduledDateStart),
  scheduledDuration: number(node.scheduledDuration),
  scheduledDateEnd: text(node.scheduledDateEnd),
  dateStart: text(node.dateStart),
  dateEnd: text(node.dateEnd),
  duration: number(node.duration),
  territoryId: text(node.territoryId),
  branchId: text(node.branchId),
  districtId: text(node.districtId),
  regionId: text(node.regionId),
  templateId: text(node.templateId),
  todo: markdown(node.todo),
});

// The update input for planned values: rich text goes in as markdown.
export const toOrderInput = (data: Partial<OrderState>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(data).map(([field, value]) => [field, field === 'todo' ? { markdown: value ?? '' } : value]));
