import { type IndexViewTrimField } from 'src/shared/install/types/index-view-trim-field.type';
import { type IndexViewTrimPlan } from 'src/shared/install/types/index-view-trim-plan.type';
import { type IndexViewTrimProgress } from 'src/shared/install/types/index-view-trim-progress.type';

const DEFAULT_MAX_VISIBLE = 10;

// A field is trimmed once: after that its visibility is staff's choice, so a
// column switched back on stays on. Fields not yet handled keep their place
// while fewer than the maximum columns show, in list order. A list given the
// columns it `only` shows gets exactly those, whatever their position.
export const planIndexViewTrim = ({
  fields,
  handled,
  maxVisible = DEFAULT_MAX_VISIBLE,
  only,
}: {
  fields: IndexViewTrimField[];
  handled: string[];
  maxVisible?: number;
  only?: string[];
}): IndexViewTrimPlan => {
  const handledIds = new Set(handled);

  if (only !== undefined) {
    const wanted = new Set(only);
    const unhandledFields = fields.filter((field) => !handledIds.has(field.fieldId));

    return {
      hide: unhandledFields.filter((field) => field.isVisible && !wanted.has(field.fieldId)).map((field) => field.fieldId),
      show: unhandledFields.filter((field) => !field.isVisible && wanted.has(field.fieldId)).map((field) => field.fieldId),
      handled: [...new Set([...handled, ...fields.map((field) => field.fieldId)])],
    };
  }
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

  return { hide, show: [], handled: [...new Set([...handled, ...fields.map((field) => field.fieldId)])] };
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
  const left = [...plan.hide, ...plan.show].filter((fieldId) => !hiddenIds.has(fieldId));
  const leftIds = new Set(left);

  return { handled: plan.handled.filter((fieldId) => !leftIds.has(fieldId)), left };
};
