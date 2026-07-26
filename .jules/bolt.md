## 2024-07-12 - Reusing Intl.NumberFormat and Intl.DateTimeFormat
**Learning:** Instantiating `Intl.NumberFormat` and `Date().toLocaleDateString()` (which uses `Intl.DateTimeFormat` under the hood) on every function call is a significant performance bottleneck, taking ~20x longer than reusing an existing formatter instance. This is especially impactful in React components where these formatters might be called multiple times during a single render (e.g., inside array `map` iterations).
**Action:** Always instantiate `Intl.NumberFormat` and `Intl.DateTimeFormat` once outside of the function or component scope and reuse the instance for formatting to improve performance.

## 2026-07-15 - Redundant Google Sheets API Calls
**Learning:** Mixing helper functions like `findRowIndexById` with direct `getRows` calls creates severe N+1 read bottlenecks. Since `findRowIndexById` internally calls `getRows` again, performing this per request significantly slows down transaction processing.
**Action:** Fetch rows once per request using `getRows` and compute required indices or totals in-memory using `findIndex` and array methods.

## 2024-07-28 - Two-pass Fetch for Sheets Storage
**Learning:** Fetching all columns of a Google Sheet when only looking for specific rows by ID can lead to an O(N) memory leak, especially when the sheet contains large data like base64-encoded file chunks. Attempting to download the entire `BuktiTransfer` sheet just to reconstruct one file takes a massive amount of memory and time.
**Action:** Use a two-pass fetch strategy: first request only the ID column to find the exact row indices matching the target file ID, then calculate the start and end row range and fetch only that specific range with all required columns.
