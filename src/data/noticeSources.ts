// Where notices come from, and the place names that tie a notice to a pilot ward.
//
// Page monitors are empty on purpose: Delhi government sites (delhi.gov.in, DJB, PWD) refuse
// TinyFish's page fetcher, and MCD's home page is built in the browser, so a page monitor only
// ever sees a blank page. Daily searches (topicQueries below) find the same announcements
// through news and official sites instead. Add a page that does load with
// `npm run setup:monitors -- --page "Name=<url>"`.

export const noticePages: { name: string; url: string }[] = [];

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
  'Delhi Jal Board water supply shutdown Karol Bagh Rajinder Nagar Patel Nagar',
  'PWD MCD road resurfacing repair Karol Bagh Pusa Road Patel Road',
  'MCD sanitation cleanliness drive Karol Bagh zone',
];
