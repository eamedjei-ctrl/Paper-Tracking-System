import type { Paper, Workspace, Author, ReadingStatus, Priority } from "./types";
import { EMPTY_FILTERS } from "./types";

const a = (s: string): Author[] =>
  s.split(";").filter(Boolean).map((n) => {
    const [family, given = ""] = n.split(",").map((x) => x.trim());
    return { family, given };
  });

const daysAgo = (d: number, h = 10) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, 0, 0, 0);
  return t.toISOString();
};

type Seed = [string, string, number | null, string, string, string, string[], ReadingStatus, Priority, number, string];

// Metadata for real, well-known papers. Abstracts are short paraphrases written for the demo, not quoted.
const seeds: Seed[] = [
  ["Guidelines for Human-AI Interaction", "Amershi, Saleema;Weld, Dan;Vorvoreanu, Mihaela;Fourney, Adam;Nushi, Besmira;Collisson, Penny;Suh, Jina;Iqbal, Shamsi;Bennett, Paul N.;Inkpen, Kori;Teevan, Jaime;Kikin-Gil, Ruth;Horvitz, Eric", 2019, "CHI Conference on Human Factors in Computing Systems", "10.1145/3290605.3300233", "Proposes and validates a set of design guidelines for AI-infused systems across the interaction lifecycle, evaluated with practitioners against real products.", ["hci", "ai", "design-guidelines"], "read", "high", 100, ""],
  ["Principles of Mixed-Initiative User Interfaces", "Horvitz, Eric", 1999, "CHI Conference on Human Factors in Computing Systems", "10.1145/302979.303030", "Discusses principles for coupling automated services with direct manipulation, including reasoning about uncertainty and the cost of interruptions.", ["hci", "mixed-initiative", "classic"], "read", "medium", 100, ""],
  ["On the Dangers of Stochastic Parrots: Can Language Models Be Too Big?", "Bender, Emily M.;Gebru, Timnit;McMillan-Major, Angelina;Shmitchell, Shmargaret", 2021, "ACM Conference on Fairness, Accountability, and Transparency", "10.1145/3442188.3445922", "Examines risks associated with ever-larger language models, including environmental cost, data documentation, and harms from fluent but ungrounded text.", ["ai", "ethics", "llm"], "revisit", "high", 100, ""],
  ["Generative Agents: Interactive Simulacra of Human Behavior", "Park, Joon Sung;O'Brien, Joseph;Cai, Carrie Jun;Morris, Meredith Ringel;Liang, Percy;Bernstein, Michael S.", 2023, "ACM Symposium on User Interface Software and Technology", "10.1145/3586183.3606763", "Introduces agents that use a language model with memory, reflection and planning to simulate believable behavior in a sandbox environment.", ["llm", "agents", "hci"], "in_progress", "high", 45, ""],
  ["Why Johnny Can't Prompt: How Non-AI Experts Try (and Fail) to Design LLM Prompts", "Zamfirescu-Pereira, J.D.;Wong, Richmond Y.;Hartmann, Bjoern;Yang, Qian", 2023, "CHI Conference on Human Factors in Computing Systems", "10.1145/3544548.3581388", "Studies how people without AI expertise approach prompt design and the breakdowns they encounter.", ["llm", "prompting", "user-study"], "in_progress", "medium", 70, ""],
  ["Human-Centered Artificial Intelligence: Reliable, Safe & Trustworthy", "Shneiderman, Ben", 2020, "International Journal of Human–Computer Interaction", "10.1080/10447318.2020.1741118", "Argues for a two-dimensional framework where high automation and high human control can coexist.", ["hci", "ai", "trust"], "unread", "medium", 0, ""],
  ["Model Cards for Model Reporting", "Mitchell, Margaret;Wu, Simone;Zaldivar, Andrew;Barnes, Parker;Vasserman, Lucy;Hutchinson, Ben;Spitzer, Elena;Raji, Inioluwa Deborah;Gebru, Timnit", 2019, "Conference on Fairness, Accountability, and Transparency", "10.1145/3287560.3287596", "Proposes short documents that accompany trained models describing intended use and evaluation across conditions.", ["ai", "documentation", "ethics"], "read", "low", 100, ""],
  ["Datasheets for Datasets", "Gebru, Timnit;Morgenstern, Jamie;Vecchione, Briana;Vaughan, Jennifer Wortman;Wallach, Hanna;Daumé III, Hal;Crawford, Kate", 2021, "Communications of the ACM", "10.1145/3458723", "Suggests that every dataset be accompanied by a datasheet documenting motivation, composition, collection and recommended uses.", ["ai", "documentation", "data"], "unread", "low", 0, ""],
  ["Trust in Automation: Designing for Appropriate Reliance", "Lee, John D.;See, Katrina A.", 2004, "Human Factors", "10.1518/hfes.46.1.50_30392", "Reviews trust as a factor mediating reliance on automation and outlines design considerations for calibrated trust.", ["trust", "automation", "classic"], "unread", "high", 0, ""],
  ["Explanation in Artificial Intelligence: Insights from the Social Sciences", "Miller, Tim", 2019, "Artificial Intelligence", "10.1016/j.artint.2018.07.007", "Draws on philosophy and psychology to argue that explainable AI should account for how people actually give and receive explanations.", ["xai", "ai", "explanation"], "in_progress", "medium", 30, ""],
  ["Direct Manipulation Interfaces", "Hutchins, Edwin L.;Hollan, James D.;Norman, Donald A.", 1985, "Human–Computer Interaction", "10.1207/s15327051hci0104_2", "Analyzes the feeling of directness in interfaces in terms of the gulfs of execution and evaluation.", ["hci", "classic"], "unread", "low", 0, ""],
  ["Attention Is All You Need", "Vaswani, Ashish;Shazeer, Noam;Parmar, Niki;Uszkoreit, Jakob;Jones, Llion;Gomez, Aidan N.;Kaiser, Łukasz;Polosukhin, Illia", 2017, "Advances in Neural Information Processing Systems", "", "Introduces the Transformer, an architecture based solely on attention mechanisms for sequence transduction.", ["llm", "ml", "architecture"], "read", "medium", 100, "https://arxiv.org/abs/1706.03762"],
  ["Language Models are Few-Shot Learners", "Brown, Tom B.;Mann, Benjamin;Ryder, Nick;Subbiah, Melanie", 2020, "Advances in Neural Information Processing Systems", "", "Shows that scaling language models improves task-agnostic few-shot performance. (Author list truncated in this demo record.)", ["llm", "ml"], "unread", "medium", 0, "https://arxiv.org/abs/2005.14165"],
  ["Notes toward conversational onboarding patterns", "", null, "", "", "A draft shared by a lab mate — missing authors, year and venue, so citations will be flagged as incomplete.", ["onboarding", "draft"], "unread", "low", 0, ""],
];

export function sampleWorkspace(): Workspace {
  const papers: Paper[] = seeds.map((s, i) => ({
    id: `p${i + 1}`,
    title: s[0],
    authors: a(s[1]),
    year: s[2],
    venue: s[3],
    doi: s[4],
    abstract: s[5],
    tags: s[6],
    status: s[7],
    priority: s[8],
    progress: s[9],
    url: s[10] || (s[4] ? `https://doi.org/${s[4]}` : ""),
    summary: "",
    notes: "",
    takeaways: [],
    questions: [],
    tasks: [],
    pdf: null,
    metadataSource: "sample",
    addedAt: daysAgo(40 - i * 3),
    updatedAt: daysAgo(Math.max(0, 20 - i * 2)),
  }));

  const p = (id: string) => papers.find((x) => x.id === id)!;
  Object.assign(p("p1"), {
    summary: "18 guidelines grouped by when they apply: initially, during interaction, when wrong, and over time. Useful checklist for my study design.",
    notes: "Guideline G2 (make clear how well the system can do what it can do) maps directly to my onboarding question.\n\nThe heuristic evaluation method is reusable for our prototype review.",
    takeaways: ["Set expectations about capability up front", "Support efficient correction when the system is wrong", "Remember recent interactions"],
    questions: ["Which guidelines are most often violated in LLM chat products?"],
    tasks: [{ id: "t1", text: "Map guidelines to our prototype screens", done: true }, { id: "t2", text: "Share checklist with lab", done: false }],
  });
  Object.assign(p("p4"), {
    summary: "Memory stream + reflection + planning architecture. Evaluation via interviews of agents and ablations.",
    notes: "Stopped at section 5 (evaluation). The retrieval scoring (recency, importance, relevance) is worth reusing.",
    takeaways: ["Reflection produces higher-level inferences from memories"],
    questions: ["How does believability evaluation compare with task-based evaluation?", "Cost of running 25 agents?"],
    tasks: [{ id: "t3", text: "Finish reading evaluation section", done: false }],
  });
  Object.assign(p("p5"), {
    summary: "Non-experts over-generalize from single successes and struggle to debug prompts systematically.",
    notes: "Relevant for the tutorial chapter in my thesis.",
    questions: ["Would a structured prompt editor reduce these failures?"],
  });
  Object.assign(p("p3"), {
    summary: "Key critique paper — revisit before writing the ethics section.",
    tasks: [{ id: "t4", text: "Pull quotes for ethics section", done: false }],
  });

  const collections = [
    { id: "c1", name: "Thesis: Trust in AI assistants", description: "Core reading for chapter 2 literature review.", color: "#3048d6", paperIds: ["p1", "p3", "p6", "p9", "p10"], shared: false, goal: 5, createdAt: daysAgo(30) },
    { id: "c2", name: "LLM interaction reading group", description: "Weekly lab reading group — shared project.", color: "#0f8a63", paperIds: ["p4", "p5", "p12", "p13"], shared: true, goal: 4, createdAt: daysAgo(25) },
    { id: "c3", name: "Responsible AI documentation", description: "Papers on documenting models and datasets.", color: "#a85f00", paperIds: ["p7", "p8", "p3"], shared: false, goal: null, createdAt: daysAgo(12) },
  ];

  const activity = [
    ["p1", "status", "Marked “Guidelines for Human-AI Interaction” as Read", 1, 16],
    ["p4", "note", "Updated notes on “Generative Agents”", 1, 11],
    ["p5", "status", "Started reading “Why Johnny Can't Prompt”", 2, 14],
    ["p12", "status", "Marked “Attention Is All You Need” as Read", 3, 9],
    ["p10", "status", "Started reading “Explanation in Artificial Intelligence”", 4, 15],
    ["p7", "status", "Marked “Model Cards for Model Reporting” as Read", 6, 10],
    ["p3", "status", "Flagged “On the Dangers of Stochastic Parrots” to revisit", 8, 13],
    ["p2", "status", "Marked “Principles of Mixed-Initiative User Interfaces” as Read", 10, 12],
    ["p4", "collection", "Added “Generative Agents” to LLM interaction reading group", 12, 9],
  ].map(([paperId, kind, message, d, h], i) => ({ id: `e${i}`, paperId: paperId as string, kind: kind as "status", message: message as string, at: daysAgo(d as number, h as number) }));

  const inDays = (d: number) => { const t = new Date(); t.setDate(t.getDate() + d); t.setHours(9, 0, 0, 0); return t.toISOString(); };

  return {
    profile: { name: "Demo Researcher", role: "student", interests: ["Human-computer interaction", "Trustworthy AI"], onboarded: true, weeklyGoal: 4, theme: "light", reduceMotion: false, notifyReminders: true, notifyComments: true },
    plan: "premium",
    subscriptionStatus: "active",
    papers,
    collections,
    members: {
      c2: [
        { email: "you@example.com", name: "You", role: "owner", status: "active" },
        { email: "ama.labmate@example.com", name: "Ama (lab mate)", role: "editor", status: "active" },
        { email: "advisor@example.edu", name: "Advisor", role: "viewer", status: "invited" },
      ],
    },
    comments: [
      { id: "m1", paperId: "p4", author: "Ama (lab mate)", body: "Let's discuss the reflection mechanism on Thursday.", createdAt: daysAgo(2, 15) },
    ],
    activity,
    reminders: [
      { id: "r1", paperId: "p4", text: "Finish Generative Agents before reading group", due: inDays(2), done: false },
      { id: "r2", paperId: "p9", text: "Start Trust in Automation for chapter 2", due: inDays(5), done: false },
      { id: "r3", paperId: null, text: "Export citations for advisor meeting", due: inDays(9), done: false },
    ],
    savedViews: [{ id: "v1", name: "High priority, unread", query: "", filters: { ...EMPTY_FILTERS, status: ["unread"], priority: ["high"] } }],
    invitations: [{ id: "i1", collectionName: "Explainability methods review", from: "Kofi (research team)", status: "pending" }],
  };
}

export function emptyWorkspace(name = ""): Workspace {
  return {
    profile: { name, role: null, interests: [], onboarded: false, weeklyGoal: 3, theme: "light", reduceMotion: false, notifyReminders: true, notifyComments: true },
    plan: "standard",
    subscriptionStatus: "none",
    papers: [], collections: [], members: {}, comments: [], activity: [], reminders: [], savedViews: [], invitations: [],
  };
}
