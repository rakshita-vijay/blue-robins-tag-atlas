# Tag Atlas

A personal project-writeup board: write up your projects once, tag them, and
find them again by clicking tags instead of scrolling and searching. Built
for anyone juggling more project ideas, portfolio pieces, or work write-ups
than they can hold in their head — tutors managing a roster of student
projects, students tracking their own portfolio, freelancers documenting
client work, or anyone who keeps re-explaining the same project from memory
because they never wrote it down properly the first time.

Live at: `https://blue-robins-tag-atlas-git-main-rax6.vercel.app`

---

## What it does

- **Sign in with email + password** — a standard sign up / sign in form
  (Supabase Auth handles the account). First-time sign-up sends a
  confirmation email with a link to click before you can sign in.
- **Write up a project in structured sections** — Intro/why, What it is,
  Exact deliverables, Future scope, Stability, Additional info, and a
  dynamic week-by-week goals list (add or remove weeks freely). Every
  project gets the same shape, so nothing important gets skipped.
- **Or skip typing entirely** — upload a `.md`/`.txt` file and it's parsed
  straight into those same structured sections automatically.
- **Drop in a file with several projects bundled together** — Tag Atlas
  detects the separate project boundaries on its own, splits them apart, and
  opens each one as its own review card in a minimized dock at the bottom of
  the screen (same idea as minimized email drafts), so you can review and
  save — or discard — each one individually instead of hand-splitting a long
  document yourself.
- **Download any project as a `.md` file, any time.** Every project's
  detail view has a **Download .md** button next to its title — it
  regenerates the write-up from its current sections (or its raw content,
  for older free-text projects) into a markdown file and downloads it
  instantly, entirely in the browser. Works for every project, including
  ones you typed by hand.
- **The original uploaded file stays downloadable too.** Open any project
  that was created (or last edited) via file upload, and its detail view
  also shows "Original file: yourfile.md — download" near the bottom of the
  page — the exact file as it was uploaded, which can differ from the
  current write-up if you've edited it since. That link is a short-lived
  (60-second) private URL generated fresh each time you open that project,
  so click it soon after opening rather than leaving the tab sitting for a
  while. Projects written by hand (no file involved) won't show this
  particular link — there's no original file to attach — but they still get
  the **Download .md** button above.
- **Tag everything, and let AI help** — click ✨ *Suggest tags with AI* on
  any write-up and it reads the content, tells you which of your *existing*
  tags genuinely apply (even ones the text never states outright), suggests
  new tags only when nothing existing fits, and flags near-duplicate tags
  before you create one that basically already exists. If your tags already
  cover the project well, it says so explicitly rather than going silent.
  Nothing is ever applied automatically — every suggestion is a one-click
  confirm.
- **Clean up tag drift over time** — the **Clean up tags** button in the
  sidebar scans your whole tag list for ones that likely mean the same
  thing (different phrasing, casing, or abbreviations of one concept) and
  shows each cluster with a canonical-tag choice. Confirm a cluster and it
  merges that tag across every project that has it, in one step. Skip any
  cluster you disagree with — nothing merges without your say-so.
- **Click tags to find projects, not the other way around** — click any
  combination of tag bubbles on the board and the sidebar re-ranks live,
  surfacing the projects matching the most clicked tags first. A search box
  always sits above the tag grid so you can filter the tag list itself once
  you have more than a screenful of tags.
- **Edit, archive, or delete** any project at any time. Archived projects
  move out of the main list without being deleted, and can be pulled back
  any time.
- **Your projects are yours** — enforced by the database itself (Postgres
  Row Level Security), not just hidden in the UI. Nobody else can read or
  touch your rows even if they had the URL.

---

## Use cases

- **Tutors / educators managing many student or client projects at once** —
  the original reason this got built: keeping dozens of project write-ups
  (each with its own intro, deliverables, timeline, and tags like grade
  level or subject) searchable by topic instead of buried in scattered
  documents.
- **A personal project portfolio** — students or self-taught developers
  logging every project they've built, tagged by skill/technology, so
  "what have I built with React" or "what have I built for a nonprofit" is
  one click instead of a memory exercise.
- **Freelancer / consultant project logs** — write up each client
  engagement once (scope, deliverables, stack, timeline) and tag by client,
  industry, or technology for quick recall during a sales call or a
  performance review.
- **A team's internal idea backlog** — dump a big brainstorm doc with many
  project ideas bundled together, let the multi-project detection split
  them into individually reviewable, taggable entries instead of one giant
  unsearchable file.
- **Research or hackathon idea tracking** — structured "intro / what it is /
  deliverables / future scope" sections are a natural fit for tracking
  research directions or hackathon concepts before committing time to one.
- **Personal knowledge base for "things I could build"** — a running,
  taggable list of project ideas with enough structure (stability, tech
  stack, timeline) to actually evaluate and pick one when you have free time.

---

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · Supabase (Postgres + Auth +
Storage, with Row Level Security) · Google Gemini API — currently
`gemini-3.5-flash` (Google's generally-available Flash-tier model as of
mid-2026; check `lib/gemini.ts` for whichever model string is actually
configured, since Google's free-tier model lineup shifts over time) — for
AI tag suggestions and tag cleanup · deployed on Vercel.

---

See **`SETUP.md`** for the full, click-by-click guide to running this
yourself — start there if you're setting it up for the first time.
