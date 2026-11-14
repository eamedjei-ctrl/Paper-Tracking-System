# PaperTrail

A research-paper tracking workspace for graduate students, researchers, lecturers and research teams. It is **frontend-only**: everything runs in the browser and data is saved in `localStorage`. There is no backend.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Motion for React

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

- **User app:** click **Explore demo** on the home page. Sample papers are stored in your browser.
- **Admin panel:** go to `/admin/login` and click **Open admin demo** for fictional accounts.
- **DOI lookup:** calls Crossref's public API directly from the browser.
- **Not available:** sign-in and sign-up pages are designed but show that accounts aren't available. Billing, invitations and reminders are simulated, and PDFs are kept for the browser session only.

## Workflow

`docs/PaperTrail-Workflow.pdf` shows the user flow and the system flow. In the app, `/app/workflow` mirrors it, and each page shows a "Step N" badge that matches the numbers in the PDF.

## Known limitations

- Drag-reordering inside a collection isn't persisted yet.
- No accounts, sync or emails. Data stays in one browser; use Settings → export to back it up.
