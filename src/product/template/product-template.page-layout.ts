import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  PRODUCT_ATTRIBUTE_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS as ATTRIBUTE_WIDGET_IDS,
  PRODUCT_COMBO_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS as COMBO_WIDGET_IDS,
  PRODUCT_COMBO_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as COMBO_FIELD_IDS,
  PRODUCT_PRICING_PAGE_LAYOUT_WIDGET_UNIVERSAL_IDENTIFIERS as PRICING_WIDGET_IDS,
  PRODUCT_PRICELIST_INVERSE_FIELD_UNIVERSAL_IDENTIFIERS as PRICING_FIELD_IDS,
  PRODUCT_TEMPLATE_ATTRIBUTE_FIELD_UNIVERSAL_IDENTIFIERS as ATTRIBUTE_FIELD_IDS,
  PRODUCT_TEMPLATE_FIELD_UNIVERSAL_IDENTIFIERS as FIELD_IDS,
  PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  PRODUCT_TEMPLATE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIERS as LAYOUT_IDS,
} from 'src/product/product-universal-identifiers.constant';

const fieldWidget = (
  universalIdentifier: string,
  title: string,
  fieldMetadataId: string,
  fieldDisplayMode: 'FIELD' | 'TABLE' = 'FIELD',
) => ({
  universalIdentifier,
  title,
  type: 'FIELD' as const,
  configuration: {
    configurationType: 'FIELD' as const,
    fieldMetadataId,
    fieldDisplayMode,
  },
});

// A custom layout replaces Twenty's default record page, so the last four tabs
// bring back its timeline, tasks, notes and files.
export default definePageLayout({
  universalIdentifier: LAYOUT_IDS.layout,
  name: 'Product page',
  type: 'RECORD_PAGE',
  objectUniversalIdentifier: PRODUCT_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  tabs: [
    {
      universalIdentifier: LAYOUT_IDS.tabGeneral,
      title: 'General',
      position: 10,
      icon: 'IconInfoCircle',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        fieldWidget(LAYOUT_IDS.widgetProductType, 'Product type', FIELD_IDS.productType),
        fieldWidget(LAYOUT_IDS.widgetCateg, 'Product category', FIELD_IDS.categ),
        fieldWidget(LAYOUT_IDS.widgetListPrice, 'Sales price', FIELD_IDS.listPrice),
        fieldWidget(LAYOUT_IDS.widgetStandardPrice, 'Cost', FIELD_IDS.standardPrice),
        fieldWidget(LAYOUT_IDS.widgetDefaultCode, 'Internal reference', FIELD_IDS.defaultCode),
        fieldWidget(LAYOUT_IDS.widgetBarcode, 'Barcode', FIELD_IDS.barcode),
        fieldWidget(LAYOUT_IDS.widgetUom, 'Unit', FIELD_IDS.uom),
        fieldWidget(LAYOUT_IDS.widgetUoms, 'Packagings', FIELD_IDS.uoms, 'TABLE'),
        fieldWidget(LAYOUT_IDS.widgetTags, 'Tags', FIELD_IDS.tags, 'TABLE'),
        fieldWidget(LAYOUT_IDS.widgetSaleOk, 'Can be sold', FIELD_IDS.saleOk),
        fieldWidget(LAYOUT_IDS.widgetPurchaseOk, 'Can be purchased', FIELD_IDS.purchaseOk),
        fieldWidget(LAYOUT_IDS.widgetDescription, 'Description', FIELD_IDS.description),
      ],
    },
    {
      universalIdentifier: LAYOUT_IDS.tabVariants,
      title: 'Attributes & variants',
      position: 20,
      icon: 'IconBoxMultiple',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        fieldWidget(ATTRIBUTE_WIDGET_IDS.widgetAttributeLines, 'Attributes', ATTRIBUTE_FIELD_IDS.attributeLines, 'TABLE'),
        fieldWidget(ATTRIBUTE_WIDGET_IDS.widgetExclusions, 'Exclusions', ATTRIBUTE_FIELD_IDS.exclusions, 'TABLE'),
        fieldWidget(LAYOUT_IDS.widgetProductVariants, 'Variants', FIELD_IDS.productVariants, 'TABLE'),
      ],
    },
    {
      universalIdentifier: LAYOUT_IDS.tabSales,
      title: 'Sales',
      position: 30,
      icon: 'IconShoppingCart',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        fieldWidget(LAYOUT_IDS.widgetDescriptionSale, 'Sales description', FIELD_IDS.descriptionSale),
        fieldWidget(
          PRICING_WIDGET_IDS.widgetPricelistRules,
          'Pricelist rules',
          PRICING_FIELD_IDS.templatePricelistRules,
          'TABLE',
        ),
        fieldWidget(COMBO_WIDGET_IDS.widgetCombos, 'Combo choices', COMBO_FIELD_IDS.templateCombos, 'TABLE'),
      ],
    },
    {
      universalIdentifier: LAYOUT_IDS.tabPurchase,
      title: 'Purchase',
      position: 40,
      icon: 'IconShoppingBag',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        fieldWidget(PRICING_WIDGET_IDS.widgetSellers, 'Vendor prices', PRICING_FIELD_IDS.templateSellers, 'TABLE'),
        fieldWidget(
          LAYOUT_IDS.widgetDescriptionPurchase,
          'Purchase description',
          FIELD_IDS.descriptionPurchase,
        ),
      ],
    },
    {
      universalIdentifier: LAYOUT_IDS.tabTimeline,
      title: 'Timeline',
      position: 50,
      icon: 'IconTimelineEvent',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: LAYOUT_IDS.widgetTimeline,
          title: 'Timeline',
          type: 'TIMELINE',
          configuration: { configurationType: 'TIMELINE' },
        },
      ],
    },
    {
      universalIdentifier: LAYOUT_IDS.tabTasks,
      title: 'Tasks',
      position: 60,
      icon: 'IconCheckbox',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: LAYOUT_IDS.widgetTasks,
          title: 'Tasks',
          type: 'TASKS',
          configuration: { configurationType: 'TASKS' },
        },
      ],
    },
    {
      universalIdentifier: LAYOUT_IDS.tabNotes,
      title: 'Notes',
      position: 70,
      icon: 'IconNotes',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: LAYOUT_IDS.widgetNotes,
          title: 'Notes',
          type: 'NOTES',
          configuration: { configurationType: 'NOTES' },
        },
      ],
    },
    {
      universalIdentifier: LAYOUT_IDS.tabFiles,
      title: 'Files',
      position: 80,
      icon: 'IconPaperclip',
      layoutMode: PageLayoutTabLayoutMode.VERTICAL_LIST,
      widgets: [
        {
          universalIdentifier: LAYOUT_IDS.widgetFiles,
          title: 'Files',
          type: 'FILES',
          configuration: { configurationType: 'FILES' },
        },
      ],
    },
  ],
});
