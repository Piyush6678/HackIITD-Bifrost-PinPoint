// Pilot area around Karol Bagh, Delhi. Boundaries are simplified rectangles
// laid over the real neighbourhoods so ward lookup works end to end. Replace
// them with the official MCD ward GeoJSON before going beyond the demo.

type Box = [minLng: number, minLat: number, maxLng: number, maxLat: number];

const rect = ([minLng, minLat, maxLng, maxLat]: Box) => ({
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
});

const ZONE = "Karol Bagh";

export const pilotWards = [
  { number: 76, name: "West Patel Nagar", box: [77.155, 28.65, 77.172, 28.665] },
  { number: 78, name: "Karol Bagh", box: [77.172, 28.65, 77.195, 28.665] },
  { number: 80, name: "Dev Nagar", box: [77.195, 28.65, 77.212, 28.665] },
  { number: 77, name: "Ranjeet Nagar", box: [77.155, 28.635, 77.172, 28.65] },
  { number: 79, name: "Rajinder Nagar", box: [77.172, 28.635, 77.195, 28.65] },
  { number: 81, name: "Prasad Nagar", box: [77.195, 28.635, 77.212, 28.65] },
].map(({ box, ...ward }) => ({
  ...ward,
  zone: ZONE,
  boundary: rect(box as Box),
  contacts: [],
}));

// Somewhere inside ward 78, used as the default map centre.
export const PILOT_CENTRE = { lat: 28.6519, lng: 77.1909 };
