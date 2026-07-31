## 2024-07-12 - Reusing Intl.NumberFormat and Intl.DateTimeFormat
**Learning:** Instantiating `Intl.NumberFormat` and `Date().toLocaleDateString()` (which uses `Intl.DateTimeFormat` under the hood) on every function call is a significant performance bottleneck, taking ~20x longer than reusing an existing formatter instance. This is especially impactful in React components where these formatters might be called multiple times during a single render (e.g., inside array `map` iterations).
**Action:** Always instantiate `Intl.NumberFormat` and `Intl.DateTimeFormat` once outside of the function or component scope and reuse the instance for formatting to improve performance.

## 2026-07-15 - Redundant Google Sheets API Calls
**Learning:** Mixing helper functions like `findRowIndexById` with direct `getRows` calls creates severe N+1 read bottlenecks. Since `findRowIndexById` internally calls `getRows` again, performing this per request significantly slows down transaction processing.
**Action:** Fetch rows once per request using `getRows` and compute required indices or totals in-memory using `findIndex` and array methods.

## 2026-07-20 - O(N) memory leak in Sheets File Storage downloads
**Learning:** When using Google Sheets to store files (where file data is chunked and stored as base64 across multiple rows), fetching the entire sheet's data (e.g. `!A2:G`) causes severe scaling issues. Because the data in columns F and G contains the actual file payloads, reading the whole range downloads the base64 of *every* uploaded file into memory on each single file request, leading to memory exhaustion and latency spikes.
**Action:** When working with blob storage via Google Sheets, optimize reads by doing a two-pass fetch: first, request only the column containing IDs (`!A2:A`), map out the `startIdx` and `endIdx` corresponding to the requested file, and then perform a targeted fetch of just that row range to retrieve the payload.

## 2026-07-25 - Caching GoogleAuth instance to prevent redundant OAuth token requests
**Learning:** Initializing a new `GoogleAuth` instance on every request (e.g. `google.auth.GoogleAuth({...})`) bypasses internal access token caching mechanisms. This causes the library to fetch a new OAuth access token over the network on every single file upload or download operation, resulting in significant (~100-300ms) latency overhead per API call.
**Action:** Always cache and reuse the initialized `sheetsClient` (or the `GoogleAuth` instance) via a singleton variable outside the function scope so that the library can internally cache and reuse the access token until it expires.
