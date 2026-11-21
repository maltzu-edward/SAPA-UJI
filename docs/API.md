# API

The App Router API uses Prisma and PostgreSQL. Mutations require a same-origin `Origin`; JSON payloads are validated with Zod. Authenticated routes use an HTTP-only `SameSite=Strict` session cookie and enforce role and institution access. Key workflow changes write audit events. Public GET routes return only published content. Responses are marked `Cache-Control: no-store`.

## Identity and institutions

- `POST /api/auth/bootstrap` — create the first super admin using `SAPA_UJI_BOOTSTRAP_TOKEN`; available only until a global super-admin role exists.
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET/PATCH /api/auth/me` — password login, database-backed session creation/revocation, current identity, and account accessibility preferences.
- `POST /api/auth/invitations`, `GET /api/auth/invitations?institutionId=...`, `POST /api/auth/invitations/accept` — role-scoped one-time invitations. The create response includes the token because no email service is connected.
- `GET /api/institutions`, `POST /api/institutions`, `PATCH /api/institutions/:id` — membership-scoped institution listing and super-admin creation/status controls.
- `GET/PATCH /api/institutions/:id/members`, `/members/:membershipId` and `GET/POST /api/auth/invitations` — member/role administration and one-time invitations.
- `GET /api/institutions/:id/audit` — institution administrator audit history.

## Research content

- `GET/POST /api/research-projects`, `GET/PATCH /api/research-projects/:id` — published public project reading and tenant-scoped draft authoring.
- `GET/POST /api/research-projects/:id/stages`, `PATCH/DELETE /api/research-projects/:id/stages/:stageId` — source-backed research journey authoring. Editing a stage returns the parent project to draft and records a content version.
- `POST /api/research-projects/:id/submit`, `/review`, `/publish`, `/archive` — draft, independent reviewer, publication, and archive transitions.
- `GET/POST /api/educational-modules`, `GET/PATCH /api/educational-modules/:id`, plus `/submit`, `/review`, `/publish`, and `/archive` — source-referenced educational content workflow. `GET /api/glossary` returns published glossary terms.
- `GET /api/assessment-categories`, `GET/POST /api/assessments`, `GET/PATCH /api/assessments/:id`, and `POST /api/assessments/:id/questions` — category discovery, authoring, and safe participant reads. Public question responses omit correctness keys and teach-back rubrics.
- `POST /api/assessments/:id/submit`, `/review`, `/publish`, and `/archive`; `PATCH /api/questions/:id`, `POST /api/questions/:id/archive` — assessment review and publication. Submission requires at least one question for each of the five comprehension topics. A reviewer cannot approve their own assessment.

## Participant and reporting

- `POST /api/assessments/:id/attempts`, `GET /api/assessments/:id/attempts` — consent-required attempt storage and a participant's own summaries. Every published question must be answered. Teach-back text is stored only for human review and is never automatically scored; the score remains marked provisional until all teach-back responses receive human review. `PATCH /api/assessment-responses/:id/review` allows an independent clinical reviewer to assess each response with the saved rubric.
- `GET/POST /api/participant-questions`, `PATCH /api/participant-questions/:id` — each participant can access only their own questions.
- `GET /api/educational-feedback` — each participant can access only their own targeted learning recommendations.
- `GET/PUT /api/learning-progress` — participant-owned progress for published modules; saving progress requires `consentToStore: true`.
- `GET /api/reviews?institutionId=...` — submitted content and pending teach-back review queue for clinical reviewers.
- `GET /api/content-versions?resourceType=...&resourceId=...` — version history for scoped institution staff.
- `GET /api/institutions/:id/analytics` — institution-scoped aggregates only. Metrics use distinct participants and are suppressed below a minimum group size of five; pre/post results are paired by participant.

Mutations require a matching same-origin `Origin` header; authenticated routes require a session cookie and role authorization. JSON payloads are validated. Use `.env.example` and the setup steps in the root README. Apply the initial Prisma migration and run `npx prisma generate` before starting the API. Seeded users have no passwords; bootstrap the first administrator, then use the invitation flow. The current browser UI still uses its local demo store and is not wired to these endpoints.

## Remaining operational work

The API has an in-memory rate limiter suitable only for a single-process development prototype. Production needs a shared rate-limit store, deployment-tested migrations, backups, monitoring, secure source-document storage and upload scanning, operational email delivery, and privacy/security review. Do not use it for real participant or clinical data until those controls and the informed-consent/data-retention workflow are reviewed.
