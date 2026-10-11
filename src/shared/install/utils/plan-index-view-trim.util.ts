import { type IndexViewTrimField } from 'src/shared/install/types/index-view-trim-field.type';
import { type IndexViewTrimPlan } from 'src/shared/install/types/index-view-trim-plan.type';
import { type IndexViewTrimProgress } from 'src/shared/install/types/index-view-trim-progress.type';

const DEFAULT_MAX_VISIBLE = 10;

// A field is trimmed once: after that its visibility is staff's choice, so a
// column switched back on stays on. Fields not yet handled keep their place
// while fewer than the maximum columns show, in list order.
export const planIndexViewTrim = ({
  fields,
  handled,
  maxVisible = DEFAULT_MAX_VISIBLE,
}: {
  fields: IndexViewTrimField[];
  handled: string[];
  maxVisible?: number;
}): IndexViewTrimPlan => {
  const handledIds = new Set(handled);
  let visibleCount = fields.filter((field) => handledIds.has(field.fieldId) && field.isVisible).length;
  const hide: string[] = [];

  const unhandled = fields
    .filter((field) => !handledIds.has(field.fieldId))
    .sort((left, right) => left.position - right.position);

  for (const field of unhandled) {
    if (!field.isVisible) {
      continue;
    }
    if (visibleCount < maxVisible) {
      visibleCount += 1;
    } else {
      hide.push(field.fieldId);
    }
  }

  return { hide, handled: [...new Set([...handled, ...fields.map((field) => field.fieldId)])] };
};

// A run that stops before hiding every planned column does not remember the ones it left, so the
// next run plans them again and hides them.
export const settleIndexViewTrim = ({
  plan,
  hidden,
}: {
  plan: IndexViewTrimPlan;
  hidden: string[];
}): IndexViewTrimProgress => {
  const hiddenIds = new Set(hidden);
  const left = plan.hide.filter((fieldId) => !hiddenIds.has(fieldId));
  const leftIds = new Set(left);

  return { handled: plan.handled.filter((fieldId) => !leftIds.has(fieldId)), left };
};
