import { z } from "zod";

/** Mutations sent from client to server in cloud mode. Validated server-side. */
const author = z.object({ given: z.string().max(200), family: z.string().max(200) });
const status = z.enum(["unread", "in_progress", "read", "revisit"]);
const priority = z.enum(["low", "medium", "high"]);
const id = z.string().min(1).max(64);

export const paperFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  authors: z.array(author).max(500),
  year: z.number().int().min(1000).max(2100).nullable(),
  venue: z.string().max(500),
  abstract: z.string().max(20000),
  doi: z.string().max(200).regex(/^(10\.\S+)?$/, "DOI should start with 10."),
  url: z.union([z.literal(""), z.string().url().max(2000)]),
  tags: z.array(z.string().trim().min(1).max(40)).max(50),
  status, priority,
  progress: z.number().min(0).max(100),
  summary: z.string().max(20000),
  notes: z.string().max(200000),
  takeaways: z.array(z.string().max(1000)).max(100),
  questions: z.array(z.string().max(1000)).max(100),
  tasks: z.array(z.object({ id, text: z.string().max(500), done: z.boolean() })).max(200),
  metadataSource: z.enum(["manual", "crossref", "bibtex", "ris", "sample"]),
  assignedTo: z.string().max(200).nullable().optional(),
});

export const opSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paper.create"), id, data: paperFields }),
  z.object({ type: z.literal("paper.import"), items: z.array(z.object({ id, data: paperFields })).max(2000), source: z.enum(["bibtex", "ris"]) }),
  z.object({ type: z.literal("paper.update"), ids: z.array(id).max(1000), data: paperFields.partial() }),
  z.object({ type: z.literal("paper.delete"), ids: z.array(id).max(1000) }),
  z.object({ type: z.literal("collection.upsert"), id, data: z.object({ name: z.string().trim().min(1).max(120), description: z.string().max(2000), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), goal: z.number().int().min(1).max(1000).nullable(), shared: z.boolean() }) }),
  z.object({ type: z.literal("collection.delete"), id }),
  z.object({ type: z.literal("collection.papers"), id, add: z.array(id).max(1000), remove: z.array(id).max(1000) }),
  z.object({ type: z.literal("reminder.upsert"), id, data: z.object({ paperId: id.nullable(), text: z.string().trim().min(1).max(300), due: z.string().datetime(), done: z.boolean() }) }),
  z.object({ type: z.literal("reminder.delete"), id }),
  z.object({ type: z.literal("comment.create"), id, paperId: id, collectionId: id, body: z.string().trim().min(1).max(5000) }),
  z.object({ type: z.literal("invite.create"), collectionId: id, email: z.string().email().max(320), role: z.enum(["editor", "viewer"]) }),
  z.object({ type: z.literal("invite.respond"), id, accept: z.boolean() }),
  z.object({ type: z.literal("profile.update"), data: z.object({ name: z.string().max(120), role: z.enum(["student", "researcher", "lecturer", "team", "other"]).nullable(), interests: z.array(z.string().max(80)).max(5), onboarded: z.boolean(), weeklyGoal: z.number().int().min(1).max(100), theme: z.enum(["system", "light", "dark"]), reduceMotion: z.boolean(), notifyReminders: z.boolean(), notifyComments: z.boolean() }).partial() }),
  z.object({ type: z.literal("view.upsert"), id, name: z.string().trim().min(1).max(80), query: z.string().max(200), filters: z.record(z.string(), z.unknown()) }),
  z.object({ type: z.literal("view.delete"), id }),
]);
export type Op = z.infer<typeof opSchema>;
