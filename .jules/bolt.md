## 2024-07-12 - Reusing Intl.NumberFormat and Intl.DateTimeFormat
**Learning:** Instantiating `Intl.NumberFormat` and `Date().toLocaleDateString()` (which uses `Intl.DateTimeFormat` under the hood) on every function call is a significant performance bottleneck, taking ~20x longer than reusing an existing formatter instance. This is especially impactful in React components where these formatters might be called multiple times during a single render (e.g., inside array `map` iterations).
**Action:** Always instantiate `Intl.NumberFormat` and `Intl.DateTimeFormat` once outside of the function or component scope and reuse the instance for formatting to improve performance.

## 2026-07-15 - Redundant Google Sheets API Calls
**Learning:** Mixing helper functions like `findRowIndexById` with direct `getRows` calls creates severe N+1 read bottlenecks. Since `findRowIndexById` internally calls `getRows` again, performing this per request significantly slows down transaction processing.
**Action:** Fetch rows once per request using `getRows` and compute required indices or totals in-memory using `findIndex` and array methods.

## 2024-07-27 - Preventing OOM in Sheets-Based File Storage
**Learning:** Fetching an entire Google Sheet into memory when it contains large base64 file chunks will inevitably lead to Out-Of-Memory (OOM) errors and massive latency spikes as the dataset grows.
**Action:** Always use a two-pass fetch strategy for large payloads: first fetch only the lightweight ID column (`A2:A`) to locate the relevant row indices, then construct a specific range query (e.g., `A5:G10`) to fetch only the necessary data subset.
