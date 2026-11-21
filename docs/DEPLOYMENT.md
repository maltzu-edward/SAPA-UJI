# Deployment

## Supabase database

The application connects to Supabase PostgreSQL through Prisma. It does not need Docker, `supabase-js`, Supabase Auth, or Supabase Storage. Deploy the Next.js server separately to a Node.js host.

Create a Supabase project, then copy its connection strings from **Connect**:

- Set `DATABASE_URL` to the transaction pooler URL (port `6543`) for application requests. Keep `pgbouncer=true` and start with `connection_limit=1` for serverless deployments.
- Set `DIRECT_URL` to the session pooler URL (port `5432`) or the direct database URL for Prisma CLI commands and migrations. Direct database connections may require IPv6 support; use the session pooler if your environment is IPv4-only.
- URL-encode special characters in the database password. Keep both values in server-side environment settings; do not prefix them with `NEXT_PUBLIC_`.

For a new, empty Supabase database, run `npx prisma generate`, `npm run db:migrate:deploy`, and `npm run db:seed`. The checked-in initial migration creates the full current schema. Use `npm run db:migrate:dev -- --name <change>` to create later migrations during development; apply committed migrations to hosted environments with `npm run db:migrate:deploy` before starting the app.

This setup creates the schema and optional synthetic seed records. It does not copy rows from an existing Docker volume. If an existing database contains records that need to be retained, export and plan that data move separately before applying the initial migration to the target. Do not run the initial migration against a database that already has these tables.

If the project will access data only through Prisma, disable Supabase's Data API in the project settings. The app's current API uses its own password login, opaque database sessions, and authorization checks; it does not use Supabase Auth. The browser demo remains separate and stores its workspace examples in local browser storage.

## Remaining deployment work

The database API and Supabase connection setup are implemented, but the deployment has not been exercised against a live Supabase project. Production still needs secure source-document storage, operational email, a shared rate-limit store, tested backups and restore procedures, monitoring, privacy/security review, and an approved retention/consent workflow. Do not use this build as a participant-data system until those controls have been completed.
