## 2024-06-12 - Resolve Google Sheets N+1 Read Anti-Pattern
**Learning:** Found a specific N+1 read pattern in this architecture where using `findRowIndexById` alongside `getRows` results in duplicate Google Sheets API requests for the same dataset, creating a performance bottleneck when doing calculations like "sum total saved".
**Action:** Always fetch the sheet rows once per route using `getRows` and compute row indices locally in-memory (using `.findIndex() + 2`) to avoid redundant API reads when mapping values back to the Google Sheet.
