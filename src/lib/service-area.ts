/**
 * Where Pickr can send a truck (handoff rule 1: pickup and delivery must both
 * be inside an active service area).
 *
 * DEMO until the server sends the admin's active areas (A05/A06): one
 * generous outline of Kerala, with a little sea margin so coastal sites pass.
 * The map picker blocks Confirm outside it, and GPS "current place" says so.
 */
export type LatLng = { latitude: number; longitude: number };

type Area = { name: string; outline: LatLng[] };

const KERALA: Area = {
  name: 'Kerala',
  // Clockwise from the north-west tip: down the coast, round the southern tip, up the Ghats.
  outline: [
    [12.8, 74.82],
    [12.4, 74.92],
    [11.85, 75.28],
    [11.2, 75.7],
    [10.75, 75.85],
    [10.2, 76.12],
    [9.9, 76.18],
    [9.45, 76.27],
    [8.85, 76.52],
    [8.45, 76.88],
    [8.22, 77.08],
    [8.28, 77.22],
    [8.7, 77.22],
    [9.05, 77.3],
    [9.55, 77.25],
    [10.0, 77.3],
    [10.35, 77.28],
    [10.55, 76.95],
    [10.85, 76.9],
    [11.2, 76.75],
    [11.45, 76.55],
    [11.75, 76.4],
    [11.98, 76.1],
    [12.15, 75.8],
    [12.55, 75.45],
    [12.8, 75.05],
  ].map(([latitude, longitude]) => ({ latitude, longitude })),
};

export const SERVICE_AREAS: Area[] = [KERALA];

/** Where "Go to the service area" takes the map: Thrissur town, the pilot's home. */
export const AREA_HOME: LatLng = { latitude: 10.5276, longitude: 76.2144 };

/** Ray casting: is the point inside the outline? */
function inside(point: LatLng, outline: LatLng[]) {
  let hit = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i];
    const b = outline[j];
    const crosses =
      a.latitude > point.latitude !== b.latitude > point.latitude &&
      point.longitude < ((b.longitude - a.longitude) * (point.latitude - a.latitude)) / (b.latitude - a.latitude) + a.longitude;
    if (crosses) hit = !hit;
  }
  return hit;
}

/** The active area that holds the point, if any. */
export function areaOf(point: LatLng) {
  return SERVICE_AREAS.find((area) => inside(point, area.outline));
}

export const inServiceArea = (point: LatLng) => areaOf(point) !== undefined;

/** Straight-line distance in metres (haversine); good enough for "is this the same spot". */
export function distanceM(a: LatLng, b: LatLng) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
