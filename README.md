# PaperTrail

A research-paper tracking workspace for graduate students, researchers, lecturers and research teams. You can collect papers, track your reading, keep notes beside the source, organize papers into collections and shared projects, and export citations.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Motion for React · Supabase (Auth, Postgres + RLS, Storage) · Stripe Billing · Zod

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

If no environment variables are set, the app runs in **demo mode**. Click **Explore demo** to get 14 sample HCI/AI papers, 3 collections, notes, reminders and a simulated Premium plan. Everything is stored in `localStorage` and nothing is sent to a server. The only exception is **DOI lookup**, which calls the public Crossref API through `/api/doi` in every mode.

## What works where

| Feature | Demo mode | With Supabase configured |
|---|---|---|
| Dashboard, library search/filter/sort, grid/list, bulk actions | ✅ local | ✅ |
| Paper detail, status/progress, autosaved notes, tasks, tags | ✅ local | ✅ persisted (RLS) |
| Collections, undoable delete, drag ordering | ✅ (ordering isn't persisted in either mode) | ✅ |
| DOI lookup (Crossref) | ✅ live | ✅ live |
| BibTeX / RIS import with duplicate detection | ✅ (Premium, simulated) | ✅ server-enforced Premium |
| PDF upload | ✅ validated, kept for the browser session only | ✅ private bucket, signed URLs (5 min) |
| Sign up / sign in / reset / sign out | — shows a "not configured" notice | ✅ Supabase Auth |
| Shared projects, invitations, comments, review assignment | ✅ simulated, no email sent | ✅ RLS-enforced membership; invites appear when the invitee signs in with that email (email delivery depends on Supabase SMTP) |
| Billing | Simulated plan switcher, clearly labelled | ✅ Stripe Checkout + Portal, webhook-driven |
| AI summaries / Q&A | Not implemented. The entitlement is hard-wired to `false` until a provider is integrated. | same |

## Supabase setup

1. Create a project and copy the URL, anon key and service-role key into `.env.local`. Use `.env.example` as the template.
2. Apply the schema: `supabase db push`, or paste `supabase/migrations/0001_init.sql` into the SQL editor. This creates every table, the RLS policies, the membership helper functions, the new-user trigger and the private `papers` storage bucket (PDF only, 50 MB).
3. Under Auth → URL configuration, add `http://localhost:3000/auth/callback` (and your production URL) to the redirect URLs.
4. Optional: run `supabase/tests/rls_check.sql` with two test users to confirm their data is isolated.

Security notes:
- Every table has RLS enabled. Private notes live in `paper_notes`, which only the owner can read, even inside shared projects.
- All writes go through `POST /api/ops`. The route validates each request with Zod, checks entitlements in `src/lib/plan-service.ts`, and runs as the signed-in user, so RLS still applies.
- `subscriptions` has no client write policies. Only the verified Stripe webhook, using the service role, can change a user's plan.
- PDFs are checked by magic bytes (`%PDF-`) and size on both client and server, stored at `<user_id>/<paper_id>.pdf`, and served through short-lived signed URLs.

## Stripe billing

1. Create a recurring Price for Premium and set `STRIPE_SECRET_KEY` and `STRIPE_PREMIUM_PRICE_ID`.
2. Add a webhook endpoint at `<APP_URL>/api/stripe/webhook` for `customer.subscription.created|updated|deleted` and set `STRIPE_WEBHOOK_SECRET`. For local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Enable the Customer Portal in the Stripe dashboard.
4. Set `NEXT_PUBLIC_PRICE_LABEL_PREMIUM` to the price you charge. No price is ever hardcoded.

Returning to the checkout success page does not grant anything. Paid access changes only when a signature-verified webhook updates `subscriptions`. `active`, `trialing` and `past_due` (as a grace period) map to Premium. `canceled` falls back to Standard, and all data stays readable and exportable.

## Plans

Limits are defined in one place, `src/lib/plans.ts`. They are enforced on the server in `/api/ops` and `/api/upload`. The client copy is only used to explain limits to the user.

## Known limitations

- Drag-reordering inside a collection isn't persisted yet. The `collection_papers.position` column exists for it.
- Reminder emails and invitation emails are not sent. The notification preferences are stored, but no mail job exists yet.
- Collaborators can read shared paper metadata and comment. Editing another member's paper (including review assignment) is restricted to the paper's owner by RLS.
