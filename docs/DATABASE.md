# Database

`prisma/schema.prisma` defines the PostgreSQL models used by the API for users, hashed sessions, roles, institutions, source references, research projects and stages, reviewed education, question rubrics, assessment attempts and responses, learning progress, participant questions, aggregate analytics, notifications, and audit events.

Supabase hosts this PostgreSQL database. Prisma uses `DATABASE_URL` for runtime queries through Supavisor's transaction pooler and `DIRECT_URL` for Prisma CLI migrations through a session pooler or direct connection. The database is accessed only from the Next.js server; the browser demo does not instantiate Prisma or write to these tables. The app continues to use its own authentication tables and session cookies.

The checked-in initial migration creates the current full schema, including session and content-version uniqueness constraints. Apply it only to a new, empty database with `npm run db:migrate:deploy`. `prisma/seed.js` is additive and idempotent; it adds a synthetic institution and study, generic learning modules, glossary terms, five-dimension assessment questions, a teach-back rubric, and clearly labeled demo review/version/audit records. Seeded users use reserved `.test` email addresses and have no password credentials; no participant accounts or attempts are created.

The seed and schema migration do not transfer records from a previous Docker database. Plan a separate data export/import if an existing database contains records that need to be kept. The browser learning demo still stores its local workspace state in the browser and does not call Prisma.
