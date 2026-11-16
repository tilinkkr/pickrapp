import type { Site } from './booking';
import { QUANTITY, searchItems } from './catalog';

/**
 * Voice booking: turning what the customer said into booking slots.
 *
 * This is the on-device parser (keywords, number words in English and
 * Malayalam, "from X to Y"). The pilot backend exposes `POST /api/voice/parse`
 * (docs/PILOT_APK_ANALYSIS.md section 4) which returns the same slots; when it
 * is connected, `parseUtterance` is the one function to point at it. The
 * screen already awaits nothing else: slots in, slots out.
 *
 * Speech-to-text itself comes from the keyboard's microphone today. A native
 * recogniser (which needs a development build, not Expo Go) plugs in by
 * calling the screen's `submit(text)` with its transcript.
 */
export type Slot = 'material' | 'quantity' | 'pickup' | 'drop' | 'when';
export const SLOTS: Slot[] = ['material', 'quantity', 'pickup', 'drop', 'when'];
export type When = { mode: 'now' } | { mode: 'tomorrow' };
export type Answers = { itemId?: string; quantity?: number; pickup?: Site; drop?: Site; when?: When };

/** Spoken numbers in English and Malayalam (script and Manglish), for "two units", "randu", "രണ്ട്". */
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  onnu: 1, randu: 2, moonu: 3, naalu: 4, anchu: 5, aaru: 6, ezhu: 7, ettu: 8, onpathu: 9, pathu: 10,
  ഒന്ന്: 1, രണ്ട്: 2, മൂന്ന്: 3, നാല്: 4, അഞ്ച്: 5, ആറ്: 6, ഏഴ്: 7, എട്ട്: 8, ഒമ്പത്: 9, പത്ത്: 10,
};

export function parseQuantity(text: string) {
  const digits = text.replace(/,/g, '').match(/\d+/);
  let n = digits ? Number(digits[0]) : undefined;
  if (n === undefined) {
    const word = text.toLowerCase().split(/\s+/).find((w) => NUMBER_WORDS[w] !== undefined);
    n = word ? NUMBER_WORDS[word] : undefined;
  }
  if (n !== undefined && /thousand|ആയിരം|aayiram/i.test(text)) n *= 1000;
  return n;
}

export function parseWhen(text: string): When | null {
  if (/now|asap|ippol|ഇപ്പോൾ|udane|ഉടനെ/i.test(text)) return { mode: 'now' };
  if (/tomorrow|naale|നാളെ/i.test(text)) return { mode: 'tomorrow' };
  return null;
}

/** Material named anywhere in a sentence: the whole text, then pairs of words, then single words. */
function findItem(text: string, language: 'en' | 'ml') {
  const words = text.toLowerCase().replace(/[.,!?]/g, ' ').split(/\s+/).filter(Boolean);
  const pairs = words.slice(1).map((w, i) => `${words[i]} ${w}`);
  for (const candidate of [...pairs, ...words.filter((w) => w.length >= 3)]) {
    const found = searchItems(candidate, language)[0];
    if (found) return found;
  }
  return undefined;
}

/** "from Ollur to Ayyanthole", "Ollur ninnu Ayyanthole lekku", "ഒല്ലൂർ നിന്ന് അയ്യന്തോൾ ലേക്ക്". */
function findRoute(text: string): { pickup?: string; drop?: string } {
  const en = text.match(/from\s+(.+?)\s+to\s+(.+?)(?=\s+(?:now|today|tomorrow|asap|ippol|naale)\b|[.,]|$)/i);
  if (en) return { pickup: en[1].trim(), drop: en[2].trim() };
  const ml = text.match(/(\S[^,]*?)\s*(?:ninnu|നിന്ന്)\s+(.+?)\s*(?:lekku|ലേക്ക്|ilekku)/i);
  if (ml) return { pickup: ml[1].trim(), drop: ml[2].trim() };
  return {};
}

/**
 * Everything one sentence gives: "2 units M-Sand from Ollur to Ayyanthole now"
 * fills all five slots and the agent jumps straight to the truck step.
 */
export function parseAll(text: string, language: 'en' | 'ml'): Answers {
  const found: Answers = {};
  const item = findItem(text, language);
  if (item) found.itemId = item.id;
  const route = findRoute(text);
  if (route.pickup && route.pickup.length >= 3) found.pickup = { label: route.pickup, source: 'manual' };
  if (route.drop && route.drop.length >= 3) found.drop = { label: route.drop, source: 'manual' };
  // Numbers inside place names ("11, MG Road") are not amounts, so read the amount outside the route.
  const outside = route.pickup ? text.replace(route.pickup, ' ').replace(route.drop ?? '', ' ') : text;
  const n = parseQuantity(outside);
  if (n && item) {
    const bounds = QUANTITY[item.measure];
    found.quantity = Math.min(bounds.max, Math.max(bounds.min, n));
  }
  const when = parseWhen(text);
  if (when) found.when = when;
  return found;
}


/** Backend hook: same result shape as the local parser. Swap the body for the API call. */
export async function parseUtterance(text: string, language: 'en' | 'ml'): Promise<Answers> {
  return parseAll(text, language);
}
