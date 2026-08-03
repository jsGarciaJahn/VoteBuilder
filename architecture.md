# VoteClient / VoteAPI Architecture (Hobby -> Commercial)

## 1. Product Direction
- Evolve current VoteBuilder into **VoteClient** (admin + creator UI).
- Build a separate **VoteAPI** as source of truth for elections, ballots, votes, and tally lifecycle.
- Support both organizer-led elections and user-created elections (multi-tenant workspace model).

## 2. System Boundaries
- VoteClient depends on VoteAPI contract (versioned JSON schemas).
- VoteAPI does **not** depend on VoteClient internals.
- Voter ballots retrieve config from VoteAPI and submit votes to VoteAPI.

## 3. Core Architecture
- Frontend: static web app (current HTML/CSS/JS codebase evolved to VoteClient).
- Backend: ASP.NET Core Minimal API (C#).
- Database: PostgreSQL (preferred for growth, auditability, and hosted reliability).
- Tally: server-side, versioned algorithms, deterministic recomputation.

## 4. Multi-Tenant and Roles
- Tenant scope: `workspaceId` on all core entities.
- Roles:
  - Owner: billing, member/role management.
  - Admin: create/publish/open/close elections, view all results.
  - Editor: draft ballots and content.
  - Voter: submit votes.
- Election visibility modes:
  - Public link.
  - Invite/token-based.
  - Private workspace-only.

## 5. Election Lifecycle
1. Create election (draft).
2. Publish ballot config.
3. Open election.
4. Accept votes.
5. Close election.
6. Compute/freeze tally.
7. Export/audit.

Rules:
- Persist votes first, tally second.
- Election config becomes immutable after open (or revisioned via clone/new version).
- Every vote references `schemaVersion`, `tallyVersion`, and `electionConfigHash`.

## 6. API Surface (v1)
Admin:
- `POST /admin/elections`
- `PUT /admin/elections/{electionId}/ballot`
- `POST /admin/elections/{electionId}/open`
- `POST /admin/elections/{electionId}/close`
- `GET /admin/elections/{electionId}/progress`
- `GET /admin/elections/{electionId}/results`
- `POST /admin/elections/{electionId}/tally/recompute`

Public voter:
- `GET /public/elections/{slugOrToken}/ballot`
- `POST /public/elections/{slugOrToken}/votes`

## 7. Vote Integrity and Anonymous/Pseudonymous Modes
- Recommended anti-multi-vote baseline: one-time tokens or magic links.
- Additional soft controls: rate limits, replay/idempotency protection, optional fingerprint signal.
- Positioning note: strict anonymity + strict one-person-one-vote cannot be fully guaranteed without identity controls; in practice this is pseudonymous anti-abuse.

## 8. Data and Audit Model (Minimum)
Core tables:
- `workspaces`, `users`, `workspace_members`
- `elections`, `ballot_configs`, `election_revisions`
- `vote_tokens` (optional by mode)
- `vote_submissions` (immutable raw payload + metadata)
- `tally_runs`, `tally_results`
- `audit_events` (append-only)

Required constraints:
- Unique idempotency key per election vote path.
- Token consumption is atomic.
- Immutable vote payload after acceptance.

## 9. Security, Privacy, Compliance (EU/Germany)
- Data minimization by default.
- EU hosting regions preferred.
- Retention policy and deletion/export workflows from early beta.
- Role-based authorization enforced server-side.
- Do not expose candidate-level partial tallies during open elections unless explicitly intended and access-controlled.

## 10. Hosting and Cost Envelope (Germany, <100 active users)
Hobby/lean expected monthly range: **~15-45 EUR**
- Static frontend hosting: 0-10 EUR
- Small API host: 7-25 EUR
- Managed Postgres starter: 0-15 EUR
- Domain/email/ops extras: 1-10 EUR

Safer production-lean range: **~50-130 EUR**
- Higher uptime API + managed DB backups + monitoring.

Viable provider patterns:
- Low-ops: static host + managed app host + managed Postgres (EU region).
- C# ecosystem path: Azure Static Web Apps + App Service/Container Apps + Azure PostgreSQL.
- Cost-optimized self-managed: small German VPS + Docker (higher ops effort).

## 11. Market Positioning and Differentiation
- Avoid competing as a generic poll tool.
- Position as **structured decision/governance voting**:
  - ranked, pairwise, tier voting
  - transparent tally explanations
  - auditable exports and lifecycle controls
- Primary monetization likely by workspace tiers and election scale limits.

## 12. Risks and Pitfalls to Avoid
- Mutating election rules after voting starts.
- Non-versioned vote/tally schemas.
- Leaky progress endpoints influencing ongoing votes.
- No idempotency/replay protections.
- Weak audit trail for disputes.
- Over-engineering early (prefer modular monolith first).
- Delaying pricing boundaries too long.

## 13. Current Codebase Assessment Snapshot
Strengths:
- Fast feature delivery and broad voting mode support.
- Growing test coverage across payload and ballot UI paths.
- Improved maintainability via shared HTML/JS/CSS composition.

Current technical debt focus:
- Build composition still includes string-based slicing/transforms (fragile if source shapes change).
- `public/js/app.js` still carries many responsibilities and should be split further by domain.

## 14. Execution Plan
Phase 1 (POC):
- Stand up VoteAPI with election create/publish/open/vote/close/results endpoints.
- Integrate VoteClient publish + voter submit against API.
- Add immutable vote store + idempotency + config hash checks.

Phase 2 (Beta):
- Multi-tenant workspaces + role model.
- Token-based voting mode.
- Progress endpoints with safe open-election visibility.
- Result exports + audit log views.

Phase 3 (Commercial readiness):
- Hardening: backups, monitoring, incident and restore drills.
- Compliance polish: retention, deletion/export, policy docs.
- Billing tiers, quotas, and plan enforcement.

## 15. Immediate Next Steps (Actionable)
1. Define v1 JSON schemas (`ballotConfig`, `voteSubmission`, `progress`, `result`).
2. Create API project skeleton (C# Minimal API + Postgres + migrations).
3. Implement election state machine and idempotent vote endpoint.
4. Wire VoteClient publish and submit flows to API contract.
5. Add tests for schema validation, state transitions, duplicate/replay handling, and tally determinism.
