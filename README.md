# PaperTrail

A research-paper tracking workspace for graduate students, researchers, lecturers and research teams. This repository is the **frontend**. The backend is a separate service that implements [`docs/BACKEND_API.md`](docs/BACKEND_API.md).

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Motion for React · Zod

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

- **Without a backend** (`NEXT_PUBLIC_API_URL` unset), everything runs in **demo mode**:
  - **Explore demo** on the home page opens the user app with sample papers, stored in your browser.
  - **Open admin demo** on `/admin/login` opens the admin panel with fictional accounts.
  - DOI lookup calls Crossref's public API directly from the browser.
- **With a backend**, set `NEXT_PUBLIC_API_URL` in `.env.local` (see `.env.example`). Sign-up, sign-in, saving, PDFs, billing and the admin panel then use it.

## Backend

- **Contract:** [`docs/BACKEND_API.md`](docs/BACKEND_API.md) lists the endpoints, request and response shapes, error codes, and the security rules the backend must enforce.
- **Shared types:** `src/lib/types.ts`, `src/lib/ops.ts` (Zod) and `src/lib/plans.ts`.
- **Reference implementation:** the `backend-original` branch has the earlier Next.js + Supabase + Stripe backend, including the SQL schema and row-level security policies.

## Workflow

`docs/PaperTrail-Workflow.pdf` shows the user flow and the system flow. In the app, `/app/workflow` mirrors it, and each page shows a "Step N" badge that matches the numbers in the PDF.

## Known limitations

- Drag-reordering inside a collection isn't persisted yet.
- Reminder and invitation emails are the backend's job (see the contract).
