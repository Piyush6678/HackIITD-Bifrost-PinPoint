// Official pages watched for notices, and the place names that tie a notice to a pilot ward.
// A page monitor reports when a page changes, so point each one at the notices listing, not
// the home page. PWD Delhi isn't listed: add its notices page with
// `npm run setup:monitors -- --page "PWD Delhi=<url>"` once the right address is confirmed.

export const noticePages = [
  { name: "Delhi Jal Board notices", url: "https://delhijalboard.delhi.gov.in/notices" },
  { name: "Delhi Jal Board latest news", url: "https://delhijalboard.delhi.gov.in/latest-news" },
  { name: "MCD", url: "https://mcdonline.nic.in/" },
];

// Names a notice may use for each pilot ward (keyed by PinPoint's ward number).
export const wardPlaceNames: Record<number, string[]> = {
  76: ["West Patel Nagar", "Patel Nagar"],
  77: ["Ranjeet Nagar", "Ranjit Nagar"],
  78: ["Karol Bagh"],
  79: ["Rajinder Nagar", "Rajender Nagar"],
  80: ["Dev Nagar"],
  81: ["Prasad Nagar"],
};

// A notice for the whole zone applies to every pilot ward.
export const ZONE_PHRASE = /karol bagh zone/i;

export const topicQueries = [
  'Karol Bagh OR "Rajinder Nagar" OR "Patel Nagar" OR "Dev Nagar" MCD notice road work water supply',
];
