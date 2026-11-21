# SAPA-UJI 2.0

SAPA-UJI is a bilingual clinical research literacy demo. It turns general research concepts into plain-language learning, comprehension practice, topic-level feedback, and questions a person can bring to a research team.

## What works in this demo

- Seven learning and support modules: Clinical Trial Simplifier, Research Journey, Comprehension Check, Comprehension Gaps, Ask My Researcher, Communication Dashboard, and Accessibility.
- Indonesian and English interface, short and detailed explanations, a glossary, browser-based narration, adjustable text size, a low-decoration mode, and responsive layouts.
- Multiple-choice and scenario questions across five comprehension dimensions. Teach-back is a free-text reflection and is never scored automatically.
- Topic-level learning feedback without a pass score or participation decision.
- A question list that can be printed or saved to PDF from the browser.
- An institutional dashboard mockup with synthetic figures labeled as illustrative, not research findings.
- Separate routes for the learning catalog, demo study, assessment, question builder, role picker, study and content management, assessment question bank, review queue, analytics report, invitations, audit history, institution settings, and super-admin tenant list.
- Local demo workflows for study drafting, reviewer decisions, revision history, publication, and member invitations. Workspace state is stored in this browser's `localStorage` so it survives page navigation.

The browser demo is not connected to the API. Its participant answers, teach-back text, and question lists stay in page memory and disappear after navigation or refresh; workspace edits persist in this browser's `localStorage`. The separate API supports authenticated, database-backed workflows. Use synthetic values while developing.

## Clinical content and safety

The demo contains general educational examples, not a real study or protocol. Study-specific stages, schedules, risks, benefits, and rights must be sourced from approved study materials and reviewed by a competent human reviewer before publication. The workspace includes a local workflow simulation, but its approvals are not clinical validation.

Scores are learning support only. They must never determine, accept, or reject trial participation. SAPA-UJI does not give medical advice, determine eligibility, replace a research team, or replace informed consent.

## Project status

The public learning and institution workflow demo, PostgreSQL API, authentication, tenant roles, source-referenced content review, assessment/teach-back workflows, participant questions, learning progress, audit history, and privacy-suppressed aggregate analytics are implemented as separate layers. The browser demo still uses local state. Email delivery, secure source-document uploads, production rate limiting, and deployment operations are not implemented. Do not use this build with real research or participant data.

## Local setup

Requirements: Node.js 20.9+, npm, and Docker Desktop.

```powershell
Copy-Item .env.example .env
docker compose up -d db
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Open http://localhost:3000. The seed creates synthetic demo content and role records with reserved `.test` email addresses. It does not set passwords or create participant records, so the seeded users cannot sign in. Bootstrap the first super administrator using the API, then use invitations to create institution accounts.

The seed is idempotent and can be rerun with `npm run db:seed`. It updates only the named SAPA-UJI demo records and does not delete other database data.

For API access, replace `SAPA_UJI_BOOTSTRAP_TOKEN` in `.env` with a unique random value of at least 32 characters. Then make a same-origin `POST /api/auth/bootstrap` with that token and the first administrator's name, email, and password. Bootstrap works only once. The API returns an HTTP-only session cookie. Administrators can issue one-time invitation tokens from `POST /api/auth/invitations`; this prototype does not send invitation email. See [docs/API.md](docs/API.md) for endpoints and workflow details.

## Project checks

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npx prisma validate
```

Run these in an environment with the npm registry available. A passing local build is not a production or clinical validation.

## Environment

See `.env.example`. `DATABASE_URL` is for local PostgreSQL. `SAPA_UJI_BOOTSTRAP_TOKEN` is only for one-time initial administrator setup. Keep it secret and remove it from the runtime environment after bootstrap.

## Project structure

- `src/app`: Next.js App Router entry point, metadata, and global styling
- `src/components`: interactive learning demo
- `src/lib`: score, session, validation, and authorization helpers
- `src/app/api`: database-backed HTTP API for auth, tenants, content, assessments, participant use cases, and analytics
- `prisma/schema.prisma`: relational domain for institutions, reviewed content, assessments, and aggregate analytics
- `docs`: current feature, API, security, database, and deployment status
