## 2024-07-16 - Google Sheets N+1 Reads Botteneck
**Learning:** Using helper functions like `findRowIndexById` that internally call `getRows` alongside direct `getRows` calls creates N+1 read bottlenecks and unnecessary API quota usage. The transaction approval route was making 5 separate Google Sheets API calls instead of 2.
**Action:** Always fetch rows once per request using `getRows` and compute required indices or totals in-memory to minimize Google Sheets API rate-limit hits and speed up responses.
