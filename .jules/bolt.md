## 2024-07-14 - Fix N+1 Google Sheets Reads
**Learning:** Using helper functions like `findRowIndexById` alongside direct `getRows` calls creates N+1 read bottlenecks. It triggered two separate API requests (one from the helper, one explicit) to the same Google Sheet.
**Action:** Fetch rows once per request via `getRows` and compute required row indices or filter sums in-memory to reduce redundant API calls and speed up backend transactions.
