import { NO_WAREHOUSE_REASON } from 'src/stock/picking-type/rules/picking-type-defaults';
import { REPLENISHMENT_REPORT_NAME } from 'src/stock/stock-options.constant';
import {
  DELAY_ON_RULE_MESSAGE,
  LEAD_DAYS_VALUE_MESSAGE,
  TIME_HORIZON_MESSAGE,
} from 'src/stock/utils/procurement/lead-days.util';

// English source texts of the reordering rules. Buttons translate them in the
// clicking user's language; triggers and the daily job write them in English.
export const ORDERPOINT_MESSAGES = {
  createSnoozedAuto: 'You can not create a snoozed orderpoint that is not manually triggered.',
  snoozeAuto:
    "You can only snooze manual orderpoints. You should rather archive 'auto-trigger' orderpoints if you do not want them to be triggered.",
  noWarehouse: NO_WAREHOUSE_REASON,
  minAboveMax: 'The minimum quantity must be less than or equal to the maximum quantity.',
  duplicateRule: 'A replenishment rule already exists for this product on this location.',
  nothingToOrder: 'There is nothing to order.',
  automateRefused: 'Automate applies to manual reordering rules with a quantity to order.',
  notFound: 'Reordering rule not found.',
  notOrdered: 'Not ordered: {rules}.',
  finishPending: 'The quantities to order of these rules are brought up to date shortly.',
  interWarehouse: 'The inter-warehouse transfers have been generated',
  ordered: 'Replenishment ordered.',
  replenishOnlyGoods: 'Replenishment is only available for inventory-managed products.',
  replenishGenerated: 'The following replenishment order have been generated',
  manualReplenishment: 'Manual Replenishment',
  productNotFound: 'Product not found.',
  replenishNegative: 'The quantity to replenish cannot be negative.',
  replenishFinishedEarlier:
    'An earlier Replenish of this product had stopped and has now been finished: {quantity} {unit} on {transfer}. Check it before you confirm again.',
  replenishFinishedEarlierNoTransfer:
    'An earlier Replenish of this product had stopped and has now been finished: {quantity} {unit}. Check it before you confirm again.',
  replenishFinishedEarlierNoUnit:
    'An earlier Replenish of this product had stopped and has now been finished: {quantity} on {transfer}. Check it before you confirm again.',
  replenishFinishedEarlierNoTransferNoUnit:
    'An earlier Replenish of this product had stopped and has now been finished: {quantity}. Check it before you confirm again.',
  replenishFinishedEarlierUnread:
    'An earlier Replenish of this product had stopped and has now been finished. Check its transfers before you confirm again.',
  replenishChoiceRefused: 'Enter a quantity and a scheduled date, and choose the unit, warehouse and route from the lists offered.',
  lowQuantity: '{warehouse} can only provide {freeQty} {uom}, while the quantity to order is {qtyToOrder} {uom}.',
  resetManual: 'Quantity to order reset to the computed quantity.',
  snoozed: 'Reordering rules snoozed.',
  snoozeDateRequired: 'Choose a snooze date.',
  saved: 'Minimum and maximum saved.',
  minMaxRequired: 'Enter a minimum and a maximum quantity.',
  routeChosen: 'Route set on the reordering rule.',
  resupplyRouteRefused: 'Choose one of the warehouses offered to resupply this reordering rule.',
  replenishmentIssueTitle: 'Replenishment issue: {product}',
  // The name of the rules the Replenishment command suggests, in the clicking user's language.
  replenishmentReport: REPLENISHMENT_REPORT_NAME,
  unprocessed: 'Reordering rule {rule} was not run: the rules ordered with it fail together, though none fails alone.',
  // The lead-time lines of the information pop-up (built by the lead-days planner).
  leadDaysDelayOnRule: DELAY_ON_RULE_MESSAGE,
  leadDaysTimeHorizon: TIME_HORIZON_MESSAGE,
  leadDaysValue: LEAD_DAYS_VALUE_MESSAGE,
} as const;
