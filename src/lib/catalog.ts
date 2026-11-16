import type { ImageSourcePropType } from 'react-native';

import type { LucideIcon } from '@/components/ui/icons';
import { BrickWall, Gem, Mountain, Shovel } from '@/components/ui/icons';
import { CATEGORY_IMAGES, ITEM_IMAGES, VEHICLE_IMAGES } from '@/constants/images';

import type { Language } from './i18n';

/** Text in both app languages. */
export type Bilingual = { en: string; ml: string };
export const pick = (text: Bilingual, language: Language) => text[language];

export type CategoryId = 'sand' | 'aggregate' | 'bricks' | 'filling';
/** Bulk material is counted in units (1 unit = 100 cubic feet); bricks and blocks by the piece. */
export type Measure = 'units' | 'bricks' | 'blocks';
export type VehicleId = 'pickup-auto' | 'tata-ace' | 'bolero' | 'lorry-14' | 'lorry-17' | 'tipper-1' | 'tipper-2' | 'taurus';

/** Two-stop gradient used by image placeholders until real photos arrive. */
export type Tint = [string, string];

export type Category = {
  id: CategoryId;
  title: Bilingual;
  prompt: Bilingual;
  icon: LucideIcon;
  tint: Tint;
  image?: ImageSourcePropType;
  /** Bulk loads are measured in units (1 unit = 100 cubic feet) and tipped out. */
  bulk: boolean;
};

export type Item = {
  id: string;
  category: CategoryId;
  name: Bilingual;
  short: Bilingual;
  /** How the customer counts this material. */
  measure: Measure;
  /** Extra search words, including Malayalam and local names. */
  keywords: string[];
  tint: Tint;
  image?: ImageSourcePropType;
  /** Shown as a reminder when the material usually needs a mineral transit pass. */
  transitPass?: boolean;
};

export type Vehicle = {
  id: VehicleId;
  name: string;
  local: Bilingual;
  description: Bilingual;
  capacity: Bilingual;
  image?: ImageSourcePropType;
  /** Units (100 cubic feet) per load, for bulk vehicles. */
  units?: number;
  /** Pieces per load, for hand-loaded vehicles. */
  bricks?: number;
  blocks?: number;
  /** DEMO per-load transport rate in rupees until the quote service exists. */
  ratePerLoad: number;
};

export const CATEGORIES: Category[] = [
  {
    id: 'sand',
    title: { en: 'Sand', ml: 'മണൽ' },
    prompt: { en: 'Choose the sand type you need', ml: 'ആവശ്യമുള്ള മണൽ തിരഞ്ഞെടുക്കുക' },
    icon: Mountain,
    tint: ['#E7B76A', '#9C6730'],
    image: CATEGORY_IMAGES.sand,
    bulk: true,
  },
  {
    id: 'aggregate',
    title: { en: 'Aggregate & Metal', ml: 'ജെല്ലി (മെറ്റൽ)' },
    prompt: { en: 'Choose the aggregate size you need', ml: 'ആവശ്യമുള്ള ജെല്ലി വലുപ്പം തിരഞ്ഞെടുക്കുക' },
    icon: Gem,
    tint: ['#B8BCC2', '#4B5058'],
    image: CATEGORY_IMAGES.aggregate,
    bulk: true,
  },
  {
    id: 'bricks',
    title: { en: 'Bricks', ml: 'ഇഷ്ടിക' },
    prompt: { en: 'Choose the bricks or blocks you need', ml: 'ആവശ്യമുള്ള ഇഷ്ടികയോ ബ്ലോക്കോ തിരഞ്ഞെടുക്കുക' },
    icon: BrickWall,
    tint: ['#C9714F', '#5E2A1C'],
    image: CATEGORY_IMAGES.bricks,
    bulk: false,
  },
  {
    id: 'filling',
    title: { en: 'Filling Items', ml: 'നിറയ്ക്കാനുള്ളവ' },
    prompt: { en: 'Choose the filling material you need', ml: 'ആവശ്യമുള്ള നിറയ്ക്കൽ സാധനം തിരഞ്ഞെടുക്കുക' },
    icon: Shovel,
    tint: ['#B48A62', '#5A3B22'],
    image: CATEGORY_IMAGES.filling,
    bulk: true,
  },
];

export const ITEMS: Item[] = [
  {
    id: 'p-sand',
    category: 'sand',
    measure: 'units',
    keywords: ['psand', 'plastering', 'plaster', 'manal', 'മണൽ', 'sand'],
    name: { en: 'P-Sand', ml: 'പി-സാൻഡ്' },
    short: { en: 'Plastering sand', ml: 'പ്ലാസ്റ്ററിംഗ് മണൽ' },
    tint: ['#A9A9A6', '#5F605E'],
    image: ITEM_IMAGES['p-sand'],
  },
  {
    id: 'm-sand',
    category: 'sand',
    measure: 'units',
    keywords: ['msand', 'manufactured', 'crushed', 'manal', 'മണൽ', 'sand'],
    name: { en: 'M-Sand', ml: 'എം-സാൻഡ്' },
    short: { en: 'Manufactured sand', ml: 'നിർമ്മിത മണൽ' },
    tint: ['#77787A', '#2F3032'],
    image: ITEM_IMAGES['m-sand'],
  },
  {
    id: 'river-sand',
    category: 'sand',
    measure: 'units',
    keywords: ['river', 'puzha', 'natural', 'manal', 'മണൽ', 'sand'],
    name: { en: 'River Sand', ml: 'പുഴമണൽ' },
    short: { en: 'Natural river sand', ml: 'സ്വാഭാവിക പുഴമണൽ' },
    tint: ['#D2B077', '#8C6A3C'],
    image: ITEM_IMAGES['river-sand'],
    transitPass: true,
  },
  {
    id: 'jelly-10',
    category: 'aggregate',
    measure: 'units',
    keywords: ['jelly', 'metal', 'aggregate', 'chips', 'kallu', 'ജെല്ലി'],
    name: { en: '10 mm Jelly', ml: '10 മില്ലിമീറ്റർ ജെല്ലി' },
    short: { en: 'Fine metal chips', ml: 'ചെറിയ മെറ്റൽ' },
    tint: ['#C4C7CB', '#6B7078'],
    image: ITEM_IMAGES['jelly-10'],
    transitPass: true,
  },
  {
    id: 'jelly-20',
    category: 'aggregate',
    measure: 'units',
    keywords: ['jelly', 'metal', 'aggregate', 'kallu', 'ജെല്ലി'],
    name: { en: '20 mm Jelly', ml: '20 മില്ലിമീറ്റർ ജെല്ലി' },
    short: { en: 'Standard concrete metal', ml: 'സാധാരണ കോൺക്രീറ്റ് മെറ്റൽ' },
    tint: ['#A3A7AD', '#50555C'],
    image: ITEM_IMAGES['jelly-20'],
    transitPass: true,
  },
  {
    id: 'jelly-40',
    category: 'aggregate',
    measure: 'units',
    keywords: ['jelly', 'metal', 'aggregate', 'kallu', 'ജെല്ലി'],
    name: { en: '40 mm Jelly', ml: '40 മില്ലിമീറ്റർ ജെല്ലി' },
    short: { en: 'Coarse metal', ml: 'വലിയ മെറ്റൽ' },
    tint: ['#8B9097', '#3D4248'],
    image: ITEM_IMAGES['jelly-40'],
    transitPass: true,
  },
  {
    id: 'red-bricks',
    category: 'bricks',
    measure: 'bricks',
    keywords: ['brick', 'ishtika', 'clay', 'ഇഷ്ടിക'],
    name: { en: 'Red Bricks', ml: 'ചുവന്ന ഇഷ്ടിക' },
    short: { en: 'Burnt clay bricks', ml: 'ചുട്ട കളിമൺ ഇഷ്ടിക' },
    tint: ['#C66A47', '#6B2D1D'],
    image: ITEM_IMAGES['red-bricks'],
  },
  {
    id: 'hollow-blocks',
    category: 'bricks',
    measure: 'blocks',
    keywords: ['block', 'hollow', 'concrete', 'ബ്ലോക്ക്'],
    name: { en: 'Hollow Blocks', ml: 'ഹോളോ ബ്ലോക്ക്' },
    short: { en: 'Concrete hollow blocks', ml: 'കോൺക്രീറ്റ് ഹോളോ ബ്ലോക്ക്' },
    tint: ['#A8A49C', '#5C5850'],
    image: ITEM_IMAGES['hollow-blocks'],
  },
  {
    id: 'soil',
    category: 'filling',
    measure: 'units',
    keywords: ['mud', 'soil', 'earth', 'mannu', 'filling', 'മണ്ണ്'],
    name: { en: 'Mud / Soil', ml: 'മണ്ണ്' },
    short: { en: 'Filling earth', ml: 'നിറയ്ക്കാനുള്ള മണ്ണ്' },
    tint: ['#A87B55', '#5A3A20'],
    image: ITEM_IMAGES.soil,
    transitPass: true,
  },
  {
    id: 'debris',
    category: 'filling',
    measure: 'units',
    keywords: ['debris', 'waste', 'rubble', 'demolition', 'അവശിഷ്ടം'],
    name: { en: 'Debris / Waste', ml: 'അവശിഷ്ടം' },
    short: { en: 'Site waste removal', ml: 'സൈറ്റ് മാലിന്യം നീക്കൽ' },
    tint: ['#9A938A', '#4A4540'],
    image: ITEM_IMAGES.debris,
  },
  // Added 2026-11-13: more Kerala materials. No photos yet, so tiles show the gradient placeholder.
  {
    id: 'jelly-6',
    category: 'aggregate',
    measure: 'units',
    keywords: ['6mm', 'baby metal', 'chips', 'jelly', 'ബേബി മെറ്റൽ'],
    name: { en: '6 mm Jelly', ml: '6 മില്ലിമീറ്റർ ജെല്ലി' },
    short: { en: 'Baby metal', ml: 'ബേബി മെറ്റൽ' },
    tint: ['#A4A9AF', '#4A4F55'],
    transitPass: true,
  },
  {
    id: 'quarry-dust',
    category: 'aggregate',
    measure: 'units',
    keywords: ['quarry dust', 'crusher dust', 'parappodi', 'പാറപ്പൊടി'],
    name: { en: 'Quarry Dust', ml: 'പാറപ്പൊടി' },
    short: { en: 'Crusher dust', ml: 'ക്രഷർ പൊടി' },
    tint: ['#B5B2AC', '#5E5B55'],
    transitPass: true,
  },
  {
    id: 'gsb',
    category: 'aggregate',
    measure: 'units',
    keywords: ['gsb', 'wet mix', 'wmm', 'sub base', 'ജിഎസ്ബി'],
    name: { en: 'GSB / Wet Mix', ml: 'ജിഎസ്ബി / വെറ്റ് മിക്സ്' },
    short: { en: 'Road base mix', ml: 'റോഡ് ബേസ് മിക്സ്' },
    tint: ['#9C9890', '#4E4A44'],
    transitPass: true,
  },
  {
    id: 'rubble',
    category: 'aggregate',
    measure: 'units',
    keywords: ['rubble', 'boulder', 'karinkallu', 'foundation stone', 'കരിങ്കല്ല്'],
    name: { en: 'Rubble Stone', ml: 'കരിങ്കല്ല്' },
    short: { en: 'Foundation stone', ml: 'അടിത്തറ കല്ല്' },
    tint: ['#7E848B', '#34383D'],
    transitPass: true,
  },
  {
    id: 'laterite',
    category: 'bricks',
    measure: 'blocks',
    keywords: ['laterite', 'vettukallu', 'chenkallu', 'വെട്ടുകല്ല്', 'ചെങ്കല്ല്'],
    name: { en: 'Laterite Stone', ml: 'വെട്ടുകല്ല്' },
    short: { en: 'Cut laterite blocks', ml: 'വെട്ടിയ ചെങ്കല്ല്' },
    tint: ['#B5523A', '#5C2418'],
  },
  {
    id: 'solid-blocks',
    category: 'bricks',
    measure: 'blocks',
    keywords: ['solid block', 'cement block', 'സോളിഡ് ബ്ലോക്ക്'],
    name: { en: 'Solid Blocks', ml: 'സോളിഡ് ബ്ലോക്ക്' },
    short: { en: 'Concrete solid blocks', ml: 'കോൺക്രീറ്റ് സോളിഡ് ബ്ലോക്ക്' },
    tint: ['#9D9A93', '#55524B'],
  },
  {
    id: 'interlock',
    category: 'bricks',
    measure: 'bricks',
    keywords: ['interlock', 'interlocking', 'mud block', 'ഇന്റർലോക്ക്'],
    name: { en: 'Interlock Bricks', ml: 'ഇന്റർലോക്ക് ഇഷ്ടിക' },
    short: { en: 'Interlocking bricks', ml: 'ഇന്റർലോക്കിംഗ് ഇഷ്ടിക' },
    tint: ['#C07A52', '#6A3A20'],
  },
  {
    id: 'aac-blocks',
    category: 'bricks',
    measure: 'blocks',
    keywords: ['aac', 'lightweight block', 'എഎസി'],
    name: { en: 'AAC Blocks', ml: 'എഎസി ബ്ലോക്ക്' },
    short: { en: 'Lightweight blocks', ml: 'ഭാരം കുറഞ്ഞ ബ്ലോക്ക്' },
    tint: ['#D5D2CB', '#8B8880'],
  },
  {
    id: 'red-earth',
    category: 'filling',
    measure: 'units',
    keywords: ['red earth', 'chemmannu', 'red soil', 'ചെമ്മണ്ണ്'],
    name: { en: 'Red Earth', ml: 'ചെമ്മണ്ണ്' },
    short: { en: 'Red filling soil', ml: 'നിറയ്ക്കാനുള്ള ചെമ്മണ്ണ്' },
    tint: ['#B4563A', '#5E2618'],
    transitPass: true,
  },
  {
    id: 'gravel',
    category: 'filling',
    measure: 'units',
    keywords: ['gravel', 'charal', 'murram', 'ചരൽ'],
    name: { en: 'Gravel', ml: 'ചരൽ' },
    short: { en: 'Filling gravel', ml: 'നിറയ്ക്കാനുള്ള ചരൽ' },
    tint: ['#A58A6A', '#54402A'],
    transitPass: true,
  },
];

export const VEHICLES: Record<VehicleId, Vehicle> = {
  'pickup-auto': {
    id: 'pickup-auto',
    name: 'Pickup Auto',
    local: { en: 'Goods auto (Ape)', ml: 'ഗുഡ്സ് ഓട്ടോ' },
    description: {
      en: 'Three-wheeler for small loads on narrow roads.',
      ml: 'ഇടുങ്ങിയ റോഡുകളിൽ ചെറിയ ലോഡിനുള്ള മുച്ചക്ര വാഹനം.',
    },
    capacity: { en: 'Up to 500 kilograms · about 200 bricks', ml: '500 കിലോഗ്രാം വരെ · ഏകദേശം 200 ഇഷ്ടിക' },
    image: VEHICLE_IMAGES['pickup-auto'],
    bricks: 200,
    blocks: 50,
    ratePerLoad: 900,
  },
  'tata-ace': {
    id: 'tata-ace',
    name: 'Tata Ace',
    local: { en: 'Ace mini truck', ml: 'ഏയ്സ്' },
    description: {
      en: 'Small four-wheeler for bricks, blocks and short trips.',
      ml: 'ഇഷ്ടിക, ബ്ലോക്ക്, ചെറിയ യാത്രകൾ എന്നിവയ്ക്കുള്ള ചെറിയ വാഹനം.',
    },
    capacity: { en: 'Up to 750 kilograms · about 300 bricks', ml: '750 കിലോഗ്രാം വരെ · ഏകദേശം 300 ഇഷ്ടിക' },
    image: VEHICLE_IMAGES['tata-ace'],
    bricks: 300,
    blocks: 80,
    ratePerLoad: 1200,
  },
  bolero: {
    id: 'bolero',
    name: 'Bolero Pickup',
    local: { en: 'Bolero pickup', ml: 'ബൊലേറോ പിക്കപ്പ്' },
    description: {
      en: 'Sturdy pickup for medium loads and rough site roads.',
      ml: 'ഇടത്തരം ലോഡിനും പരുക്കൻ സൈറ്റ് റോഡുകൾക്കുമുള്ള ഉറപ്പുള്ള പിക്കപ്പ്.',
    },
    capacity: { en: 'Up to 1.5 tonnes · about 600 bricks', ml: '1.5 ടൺ വരെ · ഏകദേശം 600 ഇഷ്ടിക' },
    image: VEHICLE_IMAGES.bolero,
    bricks: 600,
    blocks: 150,
    ratePerLoad: 1500,
  },
  'lorry-14': {
    id: 'lorry-14',
    name: '14ft Lorry',
    local: { en: 'Mini lorry (Eicher)', ml: 'മിനി ലോറി (ഐഷർ)' },
    description: {
      en: 'Open-body lorry for bulk bricks and blocks.',
      ml: 'കൂടുതൽ ഇഷ്ടികയ്ക്കും ബ്ലോക്കിനുമുള്ള തുറന്ന ലോറി.',
    },
    capacity: { en: 'Up to 4 tonnes · about 2,000 bricks', ml: '4 ടൺ വരെ · ഏകദേശം 2,000 ഇഷ്ടിക' },
    image: VEHICLE_IMAGES['lorry-14'],
    bricks: 2000,
    blocks: 500,
    ratePerLoad: 2400,
  },
  'lorry-17': {
    id: 'lorry-17',
    name: '17ft Closed Body',
    local: { en: '17 ft lorry', ml: '17 അടി ലോറി' },
    description: {
      en: 'Covered lorry that keeps bricks, blocks and cement dry in the rain.',
      ml: 'മഴയത്ത് ഇഷ്ടിക, ബ്ലോക്ക്, സിമന്റ് നനയാതെ കൊണ്ടുപോകുന്ന അടച്ച ലോറി.',
    },
    capacity: { en: 'Up to 6 tonnes · about 3,000 bricks', ml: '6 ടൺ വരെ · ഏകദേശം 3,000 ഇഷ്ടിക' },
    image: VEHICLE_IMAGES['lorry-17'],
    bricks: 3000,
    blocks: 750,
    ratePerLoad: 3200,
  },
  'tipper-1': {
    id: 'tipper-1',
    name: 'Tipper Lorry (1 unit)',
    local: { en: '407 tipper', ml: '407 ടിപ്പർ' },
    description: {
      en: 'Tips the load out at your site. The usual choice for house construction.',
      ml: 'സൈറ്റിൽ ലോഡ് ചരിച്ച് ഇറക്കും. വീട് പണിക്ക് സാധാരണ ഉപയോഗിക്കുന്നത്.',
    },
    capacity: { en: '1 unit · 100 cubic feet', ml: '1 യൂണിറ്റ് · 100 ക്യൂബിക് അടി' },
    units: 1,
    image: VEHICLE_IMAGES['tipper-1'],
    ratePerLoad: 1800,
  },
  'tipper-2': {
    id: 'tipper-2',
    name: 'Medium Tipper (2 unit)',
    local: { en: '1109 tipper', ml: '1109 ടിപ്പർ' },
    description: {
      en: 'Twice the load in one trip, for bigger sites.',
      ml: 'ഒറ്റ യാത്രയിൽ ഇരട്ടി ലോഡ്, വലിയ സൈറ്റുകൾക്ക്.',
    },
    capacity: { en: '2 units · 200 cubic feet', ml: '2 യൂണിറ്റ് · 200 ക്യൂബിക് അടി' },
    units: 2,
    image: VEHICLE_IMAGES['tipper-2'],
    ratePerLoad: 2900,
  },
  taurus: {
    id: 'taurus',
    name: 'Leyland Taurus (7 unit)',
    local: { en: 'Taurus, 10-wheeler', ml: 'ടോറസ്' },
    description: {
      en: 'Heavy multi-axle tipper for large projects. Needs a wide road to the site.',
      ml: 'വലിയ പദ്ധതികൾക്കുള്ള ഭാരമേറിയ ടിപ്പർ. സൈറ്റിലേക്ക് വീതിയുള്ള റോഡ് വേണം.',
    },
    capacity: { en: '7 units · 700 cubic feet', ml: '7 യൂണിറ്റ് · 700 ക്യൂബിക് അടി' },
    units: 7,
    image: VEHICLE_IMAGES.taurus,
    ratePerLoad: 7500,
  },
};

/** Which vehicles suit a category, best fit first. Bulk loads need a tipper; bricks are hand-loaded. */
const ELIGIBLE: Record<CategoryId, VehicleId[]> = {
  sand: ['tipper-1', 'tipper-2', 'taurus'],
  aggregate: ['tipper-1', 'tipper-2', 'taurus'],
  filling: ['tipper-1', 'tipper-2', 'taurus'],
  bricks: ['lorry-14', 'lorry-17', 'bolero', 'tata-ace', 'pickup-auto'],
};

export const getCategory = (id: string | undefined) => CATEGORIES.find((c) => c.id === id);
export const getItem = (id: string | undefined) => ITEMS.find((i) => i.id === id);
export const itemsIn = (category: CategoryId) => ITEMS.filter((i) => i.category === category);
export const vehiclesFor = (category: CategoryId) => ELIGIBLE[category].map((id) => VEHICLES[id]);

/** Stepper bounds per measure; the first value is the smart default. */
export const QUANTITY: Record<Measure, { initial: number; min: number; step: number; max: number }> = {
  units: { initial: 1, min: 1, step: 1, max: 50 },
  bricks: { initial: 1000, min: 100, step: 100, max: 20000 },
  blocks: { initial: 200, min: 50, step: 50, max: 5000 },
};

export function capacityFor(vehicle: Vehicle, measure: Measure) {
  return measure === 'units' ? vehicle.units : measure === 'bricks' ? vehicle.bricks : vehicle.blocks;
}

/** A ±10% band rounded to ₹10, so a demo estimate never reads as a fixed quote. */
export function estimateRange(total: number) {
  const round = (n: number) => Math.round(n / 10) * 10;
  return { low: round(total * 0.9), high: round(total * 1.1) };
}

export type TruckQuote = {
  vehicle: Vehicle;
  /** Trips needed to carry the whole quantity. */
  loads: number;
  total: number;
  range: { low: number; high: number };
};

/**
 * Every suitable truck for this quantity, cheapest overall first (fewer trips
 * break ties), so the first entry is the recommendation. DEMO rates.
 */
export function quoteTrucks(item: Item, quantity: number): TruckQuote[] {
  return vehiclesFor(item.category)
    .flatMap((vehicle) => {
      const capacity = capacityFor(vehicle, item.measure);
      if (!capacity) return [];
      const loads = Math.max(1, Math.ceil(quantity / capacity));
      const total = loads * vehicle.ratePerLoad;
      return [{ vehicle, loads, total, range: estimateRange(total) }];
    })
    .sort((a, b) => a.total - b.total || a.loads - b.loads);
}

export function searchItems(query: string, language: Language) {
  const q = query.trim().toLowerCase();
  if (!q) return ITEMS;
  return ITEMS.filter((item) =>
    [pick(item.name, language), item.name.en, pick(item.short, language), ...item.keywords].some((text) =>
      text.toLowerCase().includes(q)
    )
  );
}
