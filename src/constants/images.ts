import type { ImageSourcePropType } from 'react-native';

export const CATEGORY_IMAGES: Record<string, ImageSourcePropType> = {
  sand: require('@/assets/images/catalog/categories/sand.webp'),
  aggregate: require('@/assets/images/catalog/categories/aggregate.webp'),
  bricks: require('@/assets/images/catalog/categories/bricks.webp'),
  filling: require('@/assets/images/catalog/categories/filling.webp'),
};

export const ITEM_IMAGES: Record<string, ImageSourcePropType> = {
  'p-sand': require('@/assets/images/catalog/items/p-sand.webp'),
  'm-sand': require('@/assets/images/catalog/items/m-sand.webp'),
  'dry-sand': require('@/assets/images/catalog/items/dry-sand.webp'),
  'river-sand': require('@/assets/images/catalog/items/river-sand.webp'),
  'jelly-10': require('@/assets/images/catalog/items/jelly-10.webp'),
  'jelly-20': require('@/assets/images/catalog/items/jelly-20.webp'),
  'jelly-40': require('@/assets/images/catalog/items/jelly-40.webp'),
  'red-bricks': require('@/assets/images/catalog/items/red-bricks.webp'),
  'hollow-blocks': require('@/assets/images/catalog/items/hollow-blocks.webp'),
  soil: require('@/assets/images/catalog/items/soil.webp'),
  debris: require('@/assets/images/catalog/items/debris.webp'),
};

export const VEHICLE_IMAGES: Record<string, ImageSourcePropType> = {
  'pickup-auto': require('@/assets/images/catalog/vehicles/pickup-auto.webp'),
  'tata-ace': require('@/assets/images/catalog/vehicles/tata-ace.webp'),
  bolero: require('@/assets/images/catalog/vehicles/bolero.webp'),
  'lorry-14': require('@/assets/images/catalog/vehicles/lorry-14.webp'),
  'lorry-17': require('@/assets/images/catalog/vehicles/lorry-17.webp'),
  'tipper-1': require('@/assets/images/catalog/vehicles/tipper-1.webp'),
  'tipper-2': require('@/assets/images/catalog/vehicles/tipper-2.webp'),
  taurus: require('@/assets/images/catalog/vehicles/taurus.webp'),
};

/** Brand footer artwork closing the Home scroll (#go pickr — Made for India); background cut out to transparency. */
export const BRAND_FOOTER = require('@/assets/images/brand/go-pickr-footer.webp');
