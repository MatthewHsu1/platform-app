import { useEffect, useState } from 'react';
import { useTranslate } from 'twenty-sdk/front-component';

import { LEAD_FILTER_CATALOGUE } from 'src/crm/assignment/lead-filter-catalogue';
import { type LeadFilterLabels } from 'src/crm/assignment/types/lead-filter-labels.type';
import { CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/crm/crm-universal-identifiers.constant';
import { type FilterField } from 'src/shared/filter-editor/types/filter-field.type';
import { requireData, twentyMetadata } from 'src/shared/twenty-graphql';

const STAFF_LISTS = ['language', 'tags'];

type StaffOptions = Record<string, { value: string; label: string }[]>;

type LeadFields = {
  objects: { edges: { node: { fieldsList: { name: string; options: { value: string; label: string }[] | null }[] } }[] };
};

// Staff own the choices of these lists, so they are read when the editor opens.
const readStaffOptions = async (): Promise<StaffOptions> => {
  const data = requireData(
    await twentyMetadata<LeadFields>(
      'person',
      `query LeadStaffLists($objectUniversalIdentifier: UUID!) {
        objects(filter: { universalIdentifier: { eq: $objectUniversalIdentifier } }, paging: { first: 1 }) {
          edges { node { fieldsList { name options } } }
        }
      }`,
      { objectUniversalIdentifier: CRM_LEAD_OBJECT_UNIVERSAL_IDENTIFIER },
    ),
    'Read the lead lists',
  );
  const fieldsList = data.objects.edges[0]?.node.fieldsList ?? [];

  return Object.fromEntries(STAFF_LISTS.map((name) => [name, fieldsList.find((field) => field.name === name)?.options ?? []]));
};

// The editor's fields: the lead filter catalogue with translated labels, the
// choices of each list and a record picker for each relation.
export const useLeadFilterFields = (labels: LeadFilterLabels): { fields: FilterField[] | null; error: string | null } => {
  const { t } = useTranslate();
  const [staffOptions, setStaffOptions] = useState<StaffOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    readStaffOptions()
      .then((options) => {
        if (isCurrent) {
          setStaffOptions(options);
        }
      })
      .catch((caught: unknown) => {
        if (isCurrent) {
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      });

    return () => {
      isCurrent = false;
    };
  }, []);

  if (staffOptions === null) {
    return { fields: null, error };
  }
  const translated = (descriptors: Record<string, LeadFilterLabels['fields'][string]>, key: string) =>
    descriptors[key] === undefined ? key : t(descriptors[key]);
  const fields = LEAD_FILTER_CATALOGUE.map((entry): FilterField => {
    const kind = entry.hop?.kind ?? entry.kind;
    const staffList = staffOptions[entry.name];
    const values =
      staffList !== undefined
        ? staffList.map((option) => ({ name: option.value, label: option.label }))
        : entry.options?.map((value) => ({ name: value, label: translated(labels.options, value) }));

    return {
      name: entry.name,
      label: labels.fields[entry.name] === undefined ? entry.label : t(labels.fields[entry.name]),
      operators: entry.operators,
      inputType: kind === 'number' || kind === 'currency' ? 'number' : kind === 'date' ? 'date' : 'text',
      valueEditorType: entry.relation !== undefined ? 'recordPicker' : values !== undefined ? 'select' : 'text',
      values,
      recordPicker:
        entry.relation === undefined
          ? undefined
          : { objectPlural: entry.relation.objectPlural, labelField: entry.relation.labelField, labelKind: entry.relation.labelKind },
    };
  });

  return { fields, error };
};
