import { useEffect, useState } from 'react';
import { defineFrontComponent } from 'twenty-sdk/define';
import { msg, type MessageDescriptor, Trans, useRecordId, useTranslate } from 'twenty-sdk/front-component';
import { themeCssVariables } from 'twenty-ui/theme';

import { FilterEditor } from 'src/shared/filter-editor/filter-editor';
import { type FilterField } from 'src/shared/filter-editor/types/filter-field.type';
import { PUSH_FILTER_FIELDS } from 'src/stock/rule/push-filter';
import { PUSH_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/stock/routing-universal-identifiers.constant';
import { queryAsUser } from 'src/shared/front-components/query-as-user';

const FIELD_LABELS: Record<string, MessageDescriptor> = {
  productUomQty: msg('Demand'),
  quantity: msg('Quantity'),
  origin: msg('Source document'),
  priority: msg('Priority'),
  date: msg('Date scheduled'),
  'product.name': msg('Product'),
  'product.defaultCode': msg('Product: internal reference'),
  'product.barcode': msg('Product: barcode'),
  'category.name': msg('Product category'),
  'category.completeName': msg('Product category: full name'),
  'picking.name': msg('Transfer'),
  'picking.origin': msg('Transfer: source document'),
  'picking.priority': msg('Transfer: priority'),
  'picking.pickingTypeCode': msg('Transfer: type of operation'),
};

const VALUE_LABELS: Record<string, MessageDescriptor> = {
  NORMAL: msg('Normal'),
  URGENT: msg('Urgent'),
  INCOMING: msg('Receipt'),
  OUTGOING: msg('Delivery'),
  INTERNAL: msg('Internal Transfer'),
};

// Reads and saves as the signed-in user, so the row rules apply.
const PushFilter = () => {
  const theme = themeCssVariables;
  const recordId = useRecordId();
  const { t } = useTranslate();
  const [stored, setStored] = useState<{ value: unknown } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (recordId === null) {
      return;
    }
    const load = async () => {
      try {
        const data = await queryAsUser<{ stockRule: { pushDomain: unknown } | null }>(
          'query PushFilter($id: UUID!) { stockRule(filter: { id: { eq: $id } }) { pushDomain } }',
          { id: recordId },
        );
        setStored({ value: data.stockRule?.pushDomain ?? null });
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    };

    void load();
  }, [recordId]);

  if (recordId === null) {
    return <Trans>Open one rule first.</Trans>;
  }
  if (error !== null) {
    return <div style={{ color: theme.color.red, padding: theme.spacing[3] }}>{error}</div>;
  }
  if (stored === null) {
    return <Trans>Loading…</Trans>;
  }

  const fields: FilterField[] = PUSH_FILTER_FIELDS.map((field) => ({
    name: field.name,
    label: t(FIELD_LABELS[field.name]),
    inputType: field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text',
    valueEditorType: field.kind === 'select' ? 'select' : 'text',
    values: field.values?.map((value) => ({ name: value, label: t(VALUE_LABELS[value]) })),
    operators: field.kind === 'select' ? ['=', '!=', 'in', 'notIn', 'null', 'notNull'] : undefined,
  }));

  return (
    <div>
      <div style={{ padding: `${theme.spacing[3]} ${theme.spacing[3]} 0` }}>
        <Trans>The rule pushes only moves that match this filter. An empty filter pushes every move.</Trans>
      </div>
      <FilterEditor
        fields={fields}
        value={stored.value}
        texts={{
          save: t('Save filter'),
          saving: t('Saving…'),
          saved: t('Filter saved.'),
          and: t('and'),
          or: t('or'),
          operators: {
            '=': t('is'),
            '!=': t('is not'),
            '<': t('less than'),
            '<=': t('at most'),
            '>': t('more than'),
            '>=': t('at least'),
            in: t('is one of'),
            notIn: t('is none of'),
            null: t('is empty'),
            notNull: t('is set'),
          },
          translations: {
            addRule: { label: t('+ Condition'), title: t('Add condition') },
            addGroup: { label: t('+ Group'), title: t('Add group') },
            removeRule: { label: t('Remove'), title: t('Remove condition') },
            removeGroup: { label: t('Remove group'), title: t('Remove group') },
            notToggle: { label: t('Not'), title: t('Match the moves this group does not match') },
            fields: { title: t('Field') },
            operators: { title: t('Condition') },
            value: { title: t('Value') },
            values: { title: t('Values') },
            combinators: { title: t('Join conditions with') },
          },
        }}
        onSave={async (query) => {
          await queryAsUser('mutation SavePushFilter($id: UUID!, $data: StockRuleUpdateInput!) { updateStockRule(id: $id, data: $data) { id } }', {
            id: recordId,
            data: { pushDomain: query },
          });
        }}
      />
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: PUSH_FILTER_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'stock-rule-push-filter',
  description: 'Edits which moves a push rule applies to.',
  component: PushFilter,
});
