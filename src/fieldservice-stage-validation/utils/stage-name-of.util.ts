import { ORDER_STAGE_OPTIONS } from 'src/fieldservice/fieldservice-options.constant';

// The name of a stage in a message. The stage list is a staff list, so a stage staff added shows its value read
// as words (IN_PROGRESS is "In progress").
export const stageNameOf = (stage: string): string => {
  const known = ORDER_STAGE_OPTIONS.find((option) => option.value === stage);

  if (known !== undefined) {
    return known.label;
  }
  const words = stage.toLowerCase().split('_').join(' ');

  return words.charAt(0).toUpperCase() + words.slice(1);
};
