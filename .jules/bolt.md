## 2024-05-15 - [Sheets API N+1 Bottleneck]
**Learning:** Using helper functions like `findRowIndexById` interchangeably with `getRows` caused redundant API reads for Google Sheets, expanding 2 logical reads to 5 actual network requests.
**Action:** Fetch sheets data once per request, compute indices manually (`findIndex() + 2`), and update the local in-memory array before aggregating totals to prevent both extra API calls and double-counting/stale read bugs.
