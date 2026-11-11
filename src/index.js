/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/// <reference types="@fastly/js-compute" />

import * as response from './lib/response.js';
import { log } from './lib/log.js';
import { weatherHandler } from "./weather.js";

// Browser origins allowed to read responses (CORS): bv-poc-dynamic / bv-poc-dynamic-wknd on any branch + local dev
const SITE_HOST = /^[a-z0-9-]+--bv-poc-dynamic(-wknd)?--sheetal-hablani-adobe\.aem\.(page|live)$/;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  try {
    const { protocol, hostname, port } = new URL(origin);
    if (protocol === "http:" && ["localhost", "127.0.0.1"].includes(hostname) && port === "3000") return true;
    return protocol === "https:" && SITE_HOST.test(hostname);
  } catch {
    return false;
  }
}

function withCors(res, origin) {
  const headers = new Headers(res.headers);
  if (isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
  }
  headers.append("Vary", "Origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

addEventListener("fetch", (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  const req = event.request;
  const url = new URL(req.url);
  const origin = req.headers.get("Origin");

  let finalResponse;

  try {
    // Route matching
    if (req.method === "OPTIONS") {
      // Browser pre-flight check (CORS)
      finalResponse = new Response(null, { status: 204 });
    } else if (url.pathname === "/" && req.method === "GET") {
      finalResponse = new Response("Hello World from the edge!", { status: 200 });
    } else if (url.pathname === "/hello-world" && req.method === "GET") {
      finalResponse = new Response("Hello World from the edge!", { status: 200 });
    } else if (url.pathname === "/weather" && req.method === "GET") {
      finalResponse = await weatherHandler(req, event.client);
    } else {
      finalResponse = response.notFound();
    }
  } catch (err) {
    console.log(err);
    finalResponse = response.error();
  }

  finalResponse = withCors(finalResponse, origin);

  // Log the request and response
  log(req, finalResponse);

  return finalResponse;
}

