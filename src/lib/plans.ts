import type { PlanId, SubscriptionStatus } from "./types";

/**
 * Single source of truth for entitlements. The backend must enforce these (see docs/BACKEND_API.md);
 * the client only uses them to explain limits — never to grant access.
 */
export interface Entitlements {
  maxPapers: number | null;
  storageBytes: number;
  bulkImport: boolean;
  savedSearches: boolean;
  advancedFilters: boolean;
  maxCollections: number | null;
  customReminders: boolean;
  sharedProjects: boolean;
  aiFeatures: boolean;
}

const GB = 1024 ** 3;

export const PLANS: Record<PlanId, { name: string; blurb: string; entitlements: Entitlements; features: string[] }> = {
  standard: {
    name: "Standard",
    blurb: "Everything one researcher needs to keep a tidy, searchable library.",
    entitlements: {
      maxPapers: 200,
      storageBytes: 1 * GB,
      bulkImport: false,
      savedSearches: false,
      advancedFilters: false,
      maxCollections: 10,
      customReminders: false,
      sharedProjects: false,
      aiFeatures: false,
    },
    features: [
      "Up to 200 papers",
      "Search, tags, reading status and priority",
      "Notes, summaries and personal collections",
      "Basic DOI lookup",
      "1 GB PDF storage",
      "Citation copy and full data export",
    ],
  },
  premium: {
    name: "Premium",
    blurb: "For heavy readers, lab groups and shared research projects.",
    entitlements: {
      maxPapers: null,
      storageBytes: Number(process.env.NEXT_PUBLIC_PREMIUM_STORAGE_GB ?? 20) * GB,
      bulkImport: true,
      savedSearches: true,
      advancedFilters: true,
      maxCollections: null,
      customReminders: true,
      sharedProjects: true,
      aiFeatures: false, // only true when an AI provider is configured (server checks)
    },
    features: [
      "Unlimited papers",
      "Larger PDF storage allowance",
      "BibTeX and RIS bulk import",
      "Advanced filters and saved searches",
      "Unlimited projects and collections",
      "Custom reminders",
      "Shared research projects and comments",
      "AI summaries & Q&A (when an AI provider is configured)",
    ],
  },
};

/** Paid access only while subscription is active/trialing (past_due keeps a grace period). */
export function effectivePlan(plan: PlanId, status: SubscriptionStatus): PlanId {
  if (plan === "premium" && (status === "active" || status === "trialing" || status === "past_due")) return "premium";
  return "standard";
}

export function entitlementsFor(plan: PlanId, status: SubscriptionStatus): Entitlements {
  return PLANS[effectivePlan(plan, status)].entitlements;
}

/** Display prices are configured, never hardcoded. Empty means "not configured". */
export const PRICE_LABELS = {
  standard: process.env.NEXT_PUBLIC_PRICE_LABEL_STANDARD ?? "",
  premium: process.env.NEXT_PUBLIC_PRICE_LABEL_PREMIUM ?? "",
};

export const MAX_PDF_BYTES = 50 * 1024 * 1024;
