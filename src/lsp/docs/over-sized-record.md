# over-sized-record

Creating queries that request a large number of fields or large size fields could result in large data sizes (32 KB) that negatively affect mobile app performance, and potentially result in fewer returned records than expected.

To prevent potential performance issues: 
- Modify your query to request fewer than 100 fields. 
- Avoid requesting Base 64-encoded fields.
- Avoid requesting 5 text area fields.
- Avoid requesting related lists.