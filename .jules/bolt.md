## 2024-07-12 - Reusing Intl.NumberFormat and Intl.DateTimeFormat
**Learning:** Instantiating `Intl.NumberFormat` and `Date().toLocaleDateString()` (which uses `Intl.DateTimeFormat` under the hood) on every function call is a significant performance bottleneck, taking ~20x longer than reusing an existing formatter instance. This is especially impactful in React components where these formatters might be called multiple times during a single render (e.g., inside array `map` iterations).
**Action:** Always instantiate `Intl.NumberFormat` and `Intl.DateTimeFormat` once outside of the function or component scope and reuse the instance for formatting to improve performance.

## 2026-07-15 - Redundant Google Sheets API Calls
**Learning:** Mixing helper functions like `findRowIndexById` with direct `getRows` calls creates severe N+1 read bottlenecks. Since `findRowIndexById` internally calls `getRows` again, performing this per request significantly slows down transaction processing.
**Action:** Fetch rows once per request using `getRows` and compute required indices or totals in-memory using `findIndex` and array methods.

## 2024-07-28 - Optimizing Large Data Fetching from Google Sheets
**Learning:** Fetching an entire sheet with large data chunks (e.g., base64 images) causes severe memory issues and latency because of the O(N) payload size when searching for a specific file.
**Action:** When retrieving files stored as base64 chunks in Google Sheets (e.g., in the 'BuktiTransfer' tab), use a two-pass fetch to prevent O(N) memory leaks: first request only the ID column to find the file's chunk range, then fetch only that targeted row range instead of downloading the entire sheet.
