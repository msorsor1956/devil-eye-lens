# Railway data layout

- PostgreSQL stores project rows and file metadata from `schema.sql`.
- Railway object storage stores the file bytes.
- `project_files.object_key` is the stable key that links a database row to an object.
- The static site never receives database or bucket credentials. A server-side upload API is required before uploads can be enabled safely.
