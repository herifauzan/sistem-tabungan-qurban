## 2024-05-30 - Memory Leak in React Components
**Learning:** Instantiating `Intl.NumberFormat` and `Intl.DateTimeFormat` inside a React component or loop creates a new instance on every render, causing performance degradation and excessive memory usage.
**Action:** Always cache instances of `Intl.NumberFormat` and `Intl.DateTimeFormat` outside of the function or component scope.

## 2024-05-30 - GoogleAuth Typings
**Learning:** When typing the `GoogleAuth` instance in TypeScript (e.g., for module-level caching), using `InstanceType<typeof google.auth.GoogleAuth>` is necessary to avoid private member mismatch errors and TS2344 constraint errors.
**Action:** Use `InstanceType<typeof google.auth.GoogleAuth>` when caching `GoogleAuth` instances in TypeScript modules.

## 2024-05-30 - Google Sheets Row Indices
**Learning:** The Google Sheets API uses 1-based indexing for rows. When manipulating arrays of rows (e.g., from `getRows`, which omits the header row), you must adjust the 0-based index to account for both the 1-based system and the omitted header row.
**Action:** When updating Google Sheets rows based on in-memory array manipulation, map the 0-based array index to the correct Google Sheets row number by adding 2 (`rowIndex = arrayIndex + 2`).

## 2024-05-30 - Google Sheets N+1 Reads
**Learning:** Using helper functions like `findRowIndexById` alongside direct `getRows` calls in a single API endpoint triggers redundant API requests (N+1 read bottlenecks).
**Action:** Fetch rows once per request and compute required indices or totals in-memory. Ensure you update the in-memory records prior to aggregation to avoid stale reads.

## 2024-05-30 - Google Sheets Redundant OAuth Requests
**Learning:** Recreating `GoogleAuth` instances circumvents the internal token cache, causing severe backend latency due to redundant OAuth token network requests.
**Action:** Cache the client instance in a module-level singleton to utilize the internal token cache when initializing Google API clients.

## 2024-08-15 - Promise Coalescing for Google Sheets getRows
**Learning:** Concurrent network requests to the Google Sheets API via `getRows` caused redundant fetching and increased risk of rate limiting. By implementing Promise Coalescing (in-flight request deduplication), concurrent requests for the same sheet share a single network call.
**Action:** Use an in-memory Map to cache the ongoing Promise in `getRows` so that concurrent requests wait for the same Promise to resolve.
