# Deployment status

For local development, copy `.env.example`, start the PostgreSQL service with Docker Compose, install dependencies, generate the Prisma client, apply a local migration, and start Next.js. See the root README for commands.

The browser-facing demo and database API are separate. The API implements authentication and authorization, tenant-scoped content review, participant attempts and question lists, and aggregate reporting, but has not been deployment-tested. Production also needs secure source-document storage, operational email, a shared rate-limit store, migrations, backups and restore drills, monitoring, privacy/security review, and an approved retention/consent workflow. Do not deploy it as a participant-data system until those controls have been completed.
