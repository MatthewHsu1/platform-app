import { type ChoiceOption } from 'src/shared/front-components/types/choice-option.type';

// A value that is none of the options shows as an empty choice: a native
// select would otherwise show the first option while the value stays another.
export const optionsShowing = <TValue extends string>(value: TValue, options: ChoiceOption<TValue>[]): ChoiceOption<TValue>[] =>
  options.some((option) => option.value === value) ? options : [{ value, label: '' }, ...options];
