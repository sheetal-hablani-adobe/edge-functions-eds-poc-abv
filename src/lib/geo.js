/*
 * Pure helpers for the "adventures near you" demo – no fastly:* imports, so mocha can test them.
 */

// Approximate location (latitude, longitude) of each WKND adventure, keyed by page name
export const PLACES = {
  'tahoe-skiing': [39.1, -120.0],
  'yosemite-backpacking': [37.9, -119.5],
  'napa-wine-tasting': [38.3, -122.3],
  'west-coast-cycling': [36.6, -121.9],
  'beervana-portland': [45.5, -122.7],
  'whistler-mountain-biking': [50.1, -123.0],
  'colorado-rock-climbing': [39.6, -105.8],
  'cycling-southern-utah': [37.3, -113.0],
  'downhill-skiing-wyoming': [43.5, -110.8],
  'surf-camp-costa-rica': [9.8, -85.2],
  'gastronomic-marais-tour': [48.9, 2.4],
  'ski-touring-mont-blanc': [45.8, 6.9],
  'cycling-tuscany': [43.4, 11.3],
  'bali-surf-camp': [-8.7, 115.1],
  'riverside-camping-australia': [-32.0, 115.9],
  'climbing-new-zealand': [-44.0, 170.1],
};

// Great-circle distance in km between two [lat, long] points (haversine formula)
export function km([lat1, lon1], [lat2, lon2]) {
  const rad = (x) => (x * Math.PI) / 180;
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2
    + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// The `count` adventures from a query-index.json closest to `here`
export function nearest(index, here, count = 3) {
  return (index?.data || [])
    .map((page) => ({ page, slug: page.path.split('/').pop() }))
    .filter(({ page, slug }) => page.path.includes('/adventures/') && PLACES[slug])
    .map(({ page, slug }) => ({
      title: page.title,
      path: page.path,
      image: page.image,
      km: Math.round(km(here, PLACES[slug])),
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, count);
}
