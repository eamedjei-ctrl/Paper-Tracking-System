# PaperTrail — Backend API contract

The PaperTrail frontend (this repo) contains **no backend**. It talks to a separate service at `NEXT_PUBLIC_API_URL`. This document is the contract that service must implement. When `NEXT_PUBLIC_API_URL` is unset, the frontend runs in demo mode and makes no backend calls.

> **Reference implementation:** the branch [`backend-original`](../../tree/backend-original) contains a working version built on Next.js route handlers, Supabase and Stripe. It includes a full SQL schema with row-level security (`supabase/migrations/0001–0003`). You can reuse it, port it, or replace it.

Every client call goes through `src/lib/api.ts`. The shared types are canonical; please don't fork them:

| File | What it defines |
|---|---|
| `src/lib/types.ts` | `Workspace`, `Paper`, `Collection`, `Folder`, … (response shapes) |
| `src/lib/ops.ts` | Zod schemas for every write operation (request validation, reusable server-side) |
| `src/lib/plans.ts` | Standard / Premium entitlements (the limits the server must enforce) |
| `src/lib/admin.tsx` | `AdminUser`, `Overview`, `AuditEntry` (admin response shapes) |

---

## 1. Conventions

- **Auth:** a session cookie set by the backend (HttpOnly, Secure, SameSite=Lax, or None if the API is on another site). The frontend sends `credentials: "include"` on every request.
- **CORS** (if the API is on a different origin): allow the frontend origin exactly, `Access-Control-Allow-Credentials: true`, methods `GET, POST, DELETE`, header `content-type`.
- **Errors:** return JSON `{ "error": "Human-readable message" }`. The frontend shows this text to the user, so make it friendly and never include internals.

| Status | Meaning, as the UI treats it |
|---|---|
| 400 | Validation failed (send the first issue's message) |
| 401 | Not signed in. On `/auth/sign-in`, wrong email or password |
| 402 | Plan limit or Premium-only feature (e.g. "Your plan allows up to 200 papers.") |
| 403 | Account blocked, or not an admin on `/admin/*` |
| 404 | Not found |
| 413 / 415 | PDF too large / not a PDF |
| 429 | Rate limited |
| 503 | Feature not configured (e.g. billing) |

- **IDs:** the client generates UUIDs (`crypto.randomUUID()`) for new entities and sends them in ops. Accept them, but check that the id isn't already owned by someone else.
- **Logging:** never log paper text, notes, passwords or tokens.

## 2. Auth

| Method & path | Body | Success |
|---|---|---|
| `POST /auth/sign-up` | `{ name, email, password, confirmRedirect }` | `200 { signedIn: boolean }`. Use `false` when email confirmation is required; after confirming, send the user to `confirmRedirect` |
| `POST /auth/sign-in` | `{ email, password }` | `200 {}` and sets the session cookie. Wrong credentials → **401**. Blocked account → **403** |
| `POST /auth/sign-out` | — | `200 {}` and clears the cookie |
| `POST /auth/reset-password` | `{ email, redirectTo }` | Always `200 {}` so the response doesn't reveal whether the email exists. Email a link to `redirectTo?token=…` |
| `POST /auth/update-password` | `{ password, token? }` | `200 {}`. Bad or expired token → 400 |

Passwords must be at least 8 characters (the client checks this too). Hash passwords properly, or delegate to an auth provider.

## 3. Workspace (read)

`GET /workspace` → `200 { workspace: Workspace, email: string }`, or **401** if not signed in. A 401 makes the frontend fall back to the sign-in screen.

`Workspace` is defined in `src/lib/types.ts`. Things to get right:
- `papers[].summary`, `notes`, `takeaways` and `questions` are **private to the paper's owner**. Return them empty for papers the caller can only see through a shared collection.
- `plan` and `subscriptionStatus` must come from the billing records (§6), never from client input.
- `members[collectionId]` lists members and pending invites (`status: "invited"`) for shared collections.
- `invitations` lists pending invites addressed to the caller's email.
- `folders` holds the caller's project folders. `collections[].folderId` is the folder a collection belongs to, or null.
- Include papers from shared collections the caller is a member of (read-only for non-owners).

## 4. Writes — `POST /ops`

Body: `{ ops: Op[] }`, with 1–20 ops, applied in order. Response: `200 { ok: true }`, or an error status with `{ error }`. The frontend applies changes optimistically and **rolls back** on any non-2xx response, so treat each request as all-or-nothing where you can.

Validate every op with the Zod schemas in `src/lib/ops.ts`. Op types:

| `type` | What to do | Server-side rules |
|---|---|---|
| `paper.create` | Insert the paper and its notes, tags and tasks | Count limit (`maxPapers`) |
| `paper.import` | Bulk insert (BibTeX/RIS) | **Premium only** (`bulkImport`) and the count limit |
| `paper.update` | Partial update of `ids[]` | Owner only. `tags` and `tasks` replace the existing set |
| `paper.delete` | Delete papers | Owner only; also delete any stored PDFs |
| `collection.upsert` | Create or update a collection (`folderId` optional) | `maxCollections`. `shared: true` is **Premium only**. The folder must belong to the caller |
| `collection.delete` | Delete a collection | **Never delete the papers inside it** |
| `collection.papers` | Add or remove papers in a collection | Owner or editor. Added papers must be the caller's own |
| `folder.upsert` / `folder.delete` | Create, rename or delete a project folder | Owner only. On delete, set the collections' `folderId` to null |
| `reminder.upsert` / `reminder.delete` | Reminders | Creating a new one is **Premium only** (`customReminders`) |
| `comment.create` | Comment on a paper in a shared collection | Caller is a member, and the paper is in that collection |
| `invite.create` | Invite an email to a shared collection | Premium, collection owner only |
| `invite.respond` | Accept or decline an invite | Invite email must match the caller. On accept, add a membership |
| `profile.update` | Name, role, interests, theme, goals, etc. | Own profile only. **Never** `blocked_*` fields |
| `view.upsert` / `view.delete` | Saved searches | Creating one is **Premium only** (`savedSearches`) |

Log activity events for paper adds, status changes, imports and uploads; `GET /workspace` returns them. The dashboard counts a paper as "read" when an event's `message` ends with `as Read`.

## 5. PDFs

| Method & path | Body | Success |
|---|---|---|
| `POST /papers/:id/pdf` | `multipart/form-data` with a `file` field | `200 { pdf: { name, size, path } }` |
| `GET /papers/:id/pdf` | — | `200 { url }`: a **short-lived signed URL** (~5 min) |
| `DELETE /papers/:id/pdf` | — | `200 {}` |

Rules:
- Owner only.
- Maximum 50 MB per file.
- **Check the file content**: the first bytes must be `%PDF-`. Don't trust the file extension or the declared type.
- Enforce the plan's `storageBytes` across all of the user's PDFs (402 when over).
- Store files privately; never serve them from a public URL.

## 6. Billing (optional — Stripe or similar)

| Method & path | Success |
|---|---|
| `GET /billing/status` | `200 { configured: boolean }`. When `false`, the UI hides the upgrade buttons |
| `POST /billing/checkout` | `200 { url }`: a hosted checkout page for Premium |
| `POST /billing/portal` | `200 { url }`: the customer billing portal |

**Paid access is granted only by verified payment-provider webhooks**, never because the user returned from checkout.

Map subscription states to plans:
- `active`, `trialing` and `past_due` (as a grace period) → Premium.
- `canceled` → Standard.

The user's data must stay readable and exportable after a downgrade.

## 7. Account

`DELETE /account` → `200 {}`. Permanently deletes the account, all owned rows and the stored PDFs, and cancels any subscription.

## 8. Admin

Every `/admin/*` route must check on the server that the caller is an admin (**403** otherwise). Store admin membership somewhere users can't write to.

| Method & path | Success |
|---|---|
| `GET /admin/me` | `200 { email, role: "admin" \| "owner" }` |
| `GET /admin/overview` | `200 Overview`: totals, sign-up timestamps (last 30 days), the latest ~50 activity events `{ id, user (email), userId, kind, at }`, the latest audit entries |
| `GET /admin/users` | `200 { users: AdminUser[] }` |
| `POST /admin/users/:id` | Body `{ action: "block" \| "unblock", reason? }` → `200 { ok: true }` |

Blocking rules:
- `reason` is **required** for `block`.
- An admin can't block themselves. Only an `owner` can block another admin.
- Blocking must:
  1. stop new sign-ins and end existing sessions;
  2. make **every** API route return **403** for that user;
  3. keep the user's data, not delete it;
  4. write an audit entry `{ admin_email, action, target_email, target_user_id, reason, at }`.
- Unblocking reverses steps 1–2 and is also audited.

**Privacy:** admin responses must not include note, summary or paper text, or PDF contents. Counts and metadata only.

## 9. Security checklist

- [ ] Every query is scoped to the caller (or done with database row-level security).
- [ ] Private notes never leave the server for anyone except the paper's owner.
- [ ] Plan limits are enforced on the server (`src/lib/plans.ts`).
- [ ] Blocked users get 403 everywhere.
- [ ] PDF content type is checked by magic bytes; files are stored privately and served by signed URL.
- [ ] Billing state changes only from verified webhooks.
- [ ] Secrets (database, payment provider, service keys) exist only on the server.
- [ ] Auth endpoints are rate-limited.
