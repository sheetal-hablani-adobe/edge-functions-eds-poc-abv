/*
 * GET /api/nearby – the 3 WKND adventures closest to the visitor.
 * Caching demo with two layers:
 *   1. fetch cache: the site's query-index.json is cached inside the function (CacheOverride, 5 min)
 *   2. CDN cache:   this JSON reply is cached by the CDN (Cache-Control s-maxage=300, one copy per visitor IP)
 * generatedAt and indexFetchMs make both layers visible in the demo.
 */

/// <reference types="@fastly/js-compute" />

import { getGeolocationForIpAddress } from "fastly:geolocation";
import { CacheOverride } from "fastly:cache-override";
import { env } from "fastly:env";
import { nearest } from "./lib/geo.js";

const SITE = "https://main--bv-poc-dynamic-wknd--sheetal-hablani-adobe.aem.live";

const json = (body, cacheControl) => new Response(JSON.stringify(body), {
  status: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": cacheControl,
    "Surrogate-Key": "nearby adventures",
  },
});

export async function nearbyHandler(req, client) {
  // cdn.yaml copies the visitor IP into ?ip= (cache key); on the debug URL any ?ip= can be passed
  const ip = new URL(req.url).searchParams.get("ip") || client?.address;
  const geo = getGeolocationForIpAddress(ip);
  if (!geo || geo.latitude === undefined || geo.longitude === undefined) {
    return json({ error: `No location for IP ${ip}`, adventures: [] }, "public, max-age=60");
  }

  // Layer 1 – fetch cache: only the first request per CDN location (every 5 min) really fetches it
  const started = Date.now();
  const resp = await fetch(`${SITE}/query-index.json`, {
    cacheOverride: new CacheOverride("override", { ttl: 300 }),
  });
  const index = await resp.json();
  const indexFetchMs = Date.now() - started;
  console.log(`query-index.json fetched in ${indexFetchMs} ms`);

  // Layer 2 – CDN cache: 5 min (per visitor IP via the cdn.yaml ip rule); browser 0 s so every click asks the CDN
  return json({
    city: geo.city,
    country: geo.country_code,
    adventures: nearest(index, [geo.latitude, geo.longitude]),
    generatedAt: new Date().toISOString(),
    pop: env("FASTLY_POP") || "local",
    indexFetchMs,
  }, "public, max-age=0, s-maxage=300");
}
