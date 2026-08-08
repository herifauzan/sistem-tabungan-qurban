## 2024-07-12 - Reusing Intl.NumberFormat and Intl.DateTimeFormat
**Learning:** Instantiating `Intl.NumberFormat` and `Date().toLocaleDateString()` (which uses `Intl.DateTimeFormat` under the hood) on every function call is a significant performance bottleneck, taking ~20x longer than reusing an existing formatter instance. This is especially impactful in React components where these formatters might be called multiple times during a single render (e.g., inside array `map` iterations).
**Action:** Always instantiate `Intl.NumberFormat` and `Intl.DateTimeFormat` once outside of the function or component scope and reuse the instance for formatting to improve performance.

## 2026-07-15 - Redundant Google Sheets API Calls
**Learning:** Mixing helper functions like `findRowIndexById` with direct `getRows` calls creates severe N+1 read bottlenecks. Since `findRowIndexById` internally calls `getRows` again, performing this per request significantly slows down transaction processing.
**Action:** Fetch rows once per request using `getRows` and compute required indices or totals in-memory using `findIndex` and array methods.

## 2026-07-20 - O(N) memory leak in Sheets File Storage downloads
**Learning:** When using Google Sheets to store files (where file data is chunked and stored as base64 across multiple rows), fetching the entire sheet's data (e.g. `!A2:G`) causes severe scaling issues. Because the data in columns F and G contains the actual file payloads, reading the whole range downloads the base64 of *every* uploaded file into memory on each single file request, leading to memory exhaustion and latency spikes.
**Action:** When working with blob storage via Google Sheets, optimize reads by doing a two-pass fetch: first, request only the column containing IDs (`!A2:A`), map out the `startIdx` and `endIdx` corresponding to the requested file, and then perform a targeted fetch of just that row range to retrieve the payload.

## 2026-07-25 - Redundant OAuth network requests
**Learning:** Instantiating `new google.auth.GoogleAuth` inside a function that is called repeatedly without caching the instance circumvents token caching and causes severe backend latency due to redundant OAuth token network requests.
**Action:** When initializing Google API clients (e.g., `google.sheets` and `GoogleAuth`), cache the client instance in a module-level singleton to utilize the internal token cache. When typing the `GoogleAuth` instance in TypeScript (e.g., for module-level caching), use `InstanceType<typeof google.auth.GoogleAuth>` to avoid private member mismatch errors and TS2344 constraint errors.

## 2024-07-28 - Promise Coalescing for Google Sheets API Calls
**Learning:** Concurrent requests for the same sheet via `getRows` caused redundant network calls and quickly exhausted Google Sheets API rate limits (quota limits). By implementing Promise Coalescing (in-flight request deduplication), we can reuse a single API request's promise for all identical concurrent requests.
**Action:** Use an in-memory Map to cache the ongoing Promise for `getRows(sheetName)`. When a promise for the same sheet name is already in-flight, return the cached promise instead of triggering a new `google.sheets` request. Remove the promise from the cache in a `.finally()` block so subsequent requests are fetched anew.
