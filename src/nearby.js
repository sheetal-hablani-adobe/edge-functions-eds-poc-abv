/*
 * GET /api/nearby – the 3 WKND adventures closest to the visitor.
 * Caching demo with two layers, both reported in the reply:
 *   inner – fetch cache: what the function fetched from the origin (the site's query-index.json),
 *           kept 5 min inside the function (CacheOverride), tagged "query-index" for purging
 *   outer – CDN cache:   what the function returned (this small JSON), kept 5 min by the CDN,
 *           one copy per visitor IP (cdn.yaml ip rule); the CDN's x-cache / age headers show it
 */

/// <reference types="@fastly/js-compute" />

import { getGeolocationForIpAddress } from "fastly:geolocation";
import { CacheOverride } from "fastly:cache-override";
import { env } from "fastly:env";
import { nearest } from "./lib/geo.js";

const SITE = "https://main--bv-poc-dynamic-wknd--sheetal-hablani-adobe.aem.live";
const INDEX_URL = `${SITE}/query-index.json`;
const TTL = 300; // seconds, both layers

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

  // INNER layer – fetch cache: only a cache miss really goes to the origin
  const started = Date.now();
  const resp = await fetch(INDEX_URL, {
    cacheOverride: new CacheOverride("override", { ttl: TTL, surrogateKey: "query-index" }),
  });
  const text = await resp.text();
  const fetchMs = Date.now() - started;
  const index = JSON.parse(text);
  // The origin's Date header is when aem.live produced the file: it stays the same while the
  // fetch cache holds the copy, and changes when the copy is fetched from the origin again
  const fetchedFromOrigin = resp.headers.get("date");
  console.log(`inner cache: query-index.json from ${fetchedFromOrigin}, ${text.length} bytes, ${fetchMs} ms`);

  const body = {
    city: geo.city,
    country: geo.country_code,
    adventures: nearest(index, [geo.latitude, geo.longitude]),
    // OUTER layer – what the CDN stores: this reply
    outer: {
      stores: "this JSON reply, one copy per visitor IP",
      generatedAt: new Date().toISOString(),
      pop: env("FASTLY_POP") || "local",
      ttlSeconds: TTL,
    },
    // INNER layer – what the fetch cache stores: the origin file
    inner: {
      stores: "query-index.json from aem.live",
      pages: (index.data || []).length,
      bytes: text.length,
      fetchedFromOrigin,
      fetchMs,
      ttlSeconds: TTL,
      purgeKey: "query-index",
    },
  };
  // kept for the first version of the block
  body.generatedAt = body.outer.generatedAt;
  body.pop = body.outer.pop;
  body.indexFetchMs = fetchMs;

  // OUTER layer – CDN cache 5 min; browser 0 s so every click reaches the CDN
  return json(body, `public, max-age=0, s-maxage=${TTL}`);
}
