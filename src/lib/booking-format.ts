import type { Measure } from './catalog';
import type { StringKey } from './i18n';

type T = (key: StringKey, vars?: Record<string, string | number>) => string;

const n = (value: number) => value.toLocaleString('en-IN');

/** Unit word for the stepper, in full ("bulk units (100 cubic feet)", "bricks"). */
export function unitText(t: T, measure: Measure, quantity: number) {
  if (measure === 'units') return quantity === 1 ? t('bulkUnit') : t('bulkUnits');
  return measure === 'bricks' ? t('bricksWord') : t('blocksWord');
}

/** Quantity as a phrase for summaries and trip records: "2 units · 200 cubic feet", "1,000 bricks". */
export function quantityText(t: T, measure: Measure, quantity: number) {
  if (measure === 'units') {
    return `${quantity === 1 ? t('oneUnit') : t('manyUnits', { n: quantity })} · ${n(quantity * 100)} ${t('cubicFeet')}`;
  }
  return `${n(quantity)} ${measure === 'bricks' ? t('bricksWord') : t('blocksWord')}`;
}

export const loadsLabel = (t: T, loads: number) => (loads === 1 ? t('oneTrip') : t('manyTrips', { n: loads }));

/** "Tipper Lorry (1 unit)" → "Tipper Lorry", for single-line titles where the size is shown elsewhere. */
export const shortVehicleName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '');
