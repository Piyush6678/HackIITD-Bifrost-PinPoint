export type LatLng = { lat: number; lng: number };
export type GeoPoint = { type: "Point"; coordinates: [number, number] };

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

// Haversine. Accurate to well under a metre at the distances we care about.
export function distanceInMetres(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Mongo stores [lng, lat]. Everything outside the models uses { lat, lng }.
export function toGeoPoint({ lat, lng }: LatLng): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export function fromGeoPoint(point: { coordinates: number[] }): LatLng {
  const [lng, lat] = point.coordinates;
  return { lat, lng };
}

export type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

export function bboxToPolygon([minLng, minLat, maxLng, maxLat]: BBox) {
  return {
    type: "Polygon" as const,
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}

// Moves a point roughly `metres` north. Handy for tests and seeding.
export function offsetNorth(p: LatLng, metres: number): LatLng {
  return { lat: p.lat + (metres / EARTH_RADIUS_M) * (180 / Math.PI), lng: p.lng };
}

// Ray casting on a GeoJSON ring ([lng, lat] pairs). Fine for ward-sized polygons,
// where the curvature of the earth doesn't matter.
export function pointInRing({ lat, lng }: LatLng, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Polygon = outer ring followed by holes.
export function pointInPolygon(point: LatLng, polygon: { coordinates: number[][][] }) {
  const [outer, ...holes] = polygon.coordinates;
  return pointInRing(point, outer) && !holes.some((hole) => pointInRing(point, hole));
}
