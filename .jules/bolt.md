## 2024-05-24 - Google Sheets API N+1 Reads via Helper Functions
**Learning:** Helper functions that encapsulate API calls (like `findRowIndexById` which internally calls `getRows`) can easily cause hidden N+1 read problems when combined with direct API calls (like calling `getRows` again in the main logic).
**Action:** Always inspect the implementation of helper functions to see if they make network requests. When an endpoint needs both data and indices, fetch the data once and compute everything in-memory rather than relying on helpers that re-fetch.
