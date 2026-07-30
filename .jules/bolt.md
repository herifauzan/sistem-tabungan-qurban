## 2024-07-12 - Reusing Intl.NumberFormat and Intl.DateTimeFormat
**Learning:** Instantiating `Intl.NumberFormat` and `Date().toLocaleDateString()` (which uses `Intl.DateTimeFormat` under the hood) on every function call is a significant performance bottleneck, taking ~20x longer than reusing an existing formatter instance. This is especially impactful in React components where these formatters might be called multiple times during a single render (e.g., inside array `map` iterations).
**Action:** Always instantiate `Intl.NumberFormat` and `Intl.DateTimeFormat` once outside of the function or component scope and reuse the instance for formatting to improve performance.

## 2026-07-15 - Redundant Google Sheets API Calls
**Learning:** Mixing helper functions like `findRowIndexById` with direct `getRows` calls creates severe N+1 read bottlenecks. Since `findRowIndexById` internally calls `getRows` again, performing this per request significantly slows down transaction processing.
**Action:** Fetch rows once per request using `getRows` and compute required indices or totals in-memory using `findIndex` and array methods.

## 2024-07-28 - O(N) Memory Leak in Google Sheets File Storage
**Learning:** When using Google Sheets to store files as chunks of base64 data, fetching the entire sheet (`range: BuktiTransfer!A2:G`) just to retrieve a single file downloads every chunk of every file into memory. This causes a severe O(N) memory leak that crashes the Node.js process as the number of uploads grows.
**Action:** When retrieving files stored as base64 chunks in Google Sheets, use a two-pass fetch strategy. First pass: fetch only the ID column (`A2:A`) to determine the start and end row indices for the target file. Second pass: fetch only the specific row range containing the chunks for that file (`A${startIdx}:G${endIdx}`).
