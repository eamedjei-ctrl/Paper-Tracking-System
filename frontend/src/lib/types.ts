export type ReadingStatus = "unread" | "in_progress" | "read" | "revisit";
export type Priority = "low" | "medium" | "high";
export type PlanId = "standard" | "premium";
export type SubscriptionStatus = "none" | "trialing" | "active" | "past_due" | "canceled";

export interface Author { given: string; family: string }

export interface Task { id: string; text: string; done: boolean }

export interface Paper {
  id: string;
  title: string;
  authors: Author[];
  year: number | null;
  venue: string;
  abstract: string;
  doi: string;
  url: string;
  tags: string[];
  status: ReadingStatus;
  priority: Priority;
  progress: number; // 0-100
  summary: string;
  notes: string;
  takeaways: string[];
  questions: string[];
  tasks: Task[];
  pdf: { name: string; size: number; path: string } | null;
  metadataSource: "manual" | "crossref" | "bibtex" | "ris" | "sample";
  addedAt: string;
  updatedAt: string;
  assignedTo?: string | null;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  paperIds: string[];
  shared: boolean;
  goal: number | null; // papers to read
  createdAt: string;
  folderId?: string | null;
}

export interface Folder { id: string; name: string; color: string; createdAt: string }

export interface Member { email: string; name: string; role: "owner" | "editor" | "viewer"; status: "active" | "invited" | "declined" }

export interface Comment { id: string; paperId: string; author: string; body: string; createdAt: string }

export interface ActivityEvent { id: string; paperId: string | null; kind: "added" | "status" | "note" | "collection" | "import" | "upload" | "comment"; message: string; at: string }

export interface Reminder { id: string; paperId: string | null; text: string; due: string; done: boolean }

export interface SavedView { id: string; name: string; query: string; filters: Filters }

export interface Filters {
  status: ReadingStatus[];
  priority: Priority[];
  tags: string[];
  collection: string | null;
  yearFrom: number | null;
  yearTo: number | null;
}

export interface Profile {
  name: string;
  role: "student" | "researcher" | "lecturer" | "team" | "other" | null;
  interests: string[];
  onboarded: boolean;
  weeklyGoal: number;
  theme: "system" | "light" | "dark";
  reduceMotion: boolean;
  notifyReminders: boolean;
  notifyComments: boolean;
}

export interface Workspace {
  profile: Profile;
  plan: PlanId;
  subscriptionStatus: SubscriptionStatus;
  papers: Paper[];
  collections: Collection[];
  folders: Folder[];
  members: Record<string, Member[]>; // collectionId -> members
  comments: Comment[];
  activity: ActivityEvent[];
  reminders: Reminder[];
  savedViews: SavedView[];
  invitations: { id: string; collectionName: string; from: string; status: "pending" | "accepted" | "declined" }[];
}

export const STATUS_LABEL: Record<ReadingStatus, string> = {
  unread: "To read",
  in_progress: "In progress",
  read: "Read",
  revisit: "Revisit",
};
export const PRIORITY_LABEL: Record<Priority, string> = { low: "Low", medium: "Medium", high: "High" };
export const EMPTY_FILTERS: Filters = { status: [], priority: [], tags: [], collection: null, yearFrom: null, yearTo: null };
