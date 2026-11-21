# Architecture status

The current app is a responsive Next.js App Router demo. The root page contains the seven-module learning experience. A catch-all route exposes the learning catalog and details, demo study, assessment, question builder, accessibility settings, demo role selection, and institution workspace pages for studies, content, assessment questions, reviews, analytics, users, audit history, settings, and platform administration.

The browser UI remains a standalone demo: participant answers, teach-back, and question lists live in React state, while workspace edits use browser `localStorage`. It does not call the database API. The dashboard uses fixed synthetic values and clearly labels them as illustrative. The client role picker is not authentication or authorization.

Database API routes are under `src/app/api`; shared Prisma, session, validation, and permission helpers are in `src/lib`. API sessions and password hashes use the User/Session tables, and content changes create versions and audit records. The Prisma schema describes source documents, review/version history, assessments, learning progress, and aggregate snapshots. The browser demo and API are separate prototypes until the UI is intentionally connected and end-to-end privacy and security behavior is reviewed.
