# Tag Atlas — Setup Guide (start to finish)

Follow this top to bottom, in order. This has been checked directly against
the current codebase (not written from memory) — every feature and file
mentioned below actually exists in `app/`, `components/`, and `lib/` as
described.

---

## Part 1 — Supabase project setup (15 minutes)

### Create the project

1. Go to **https://supabase.com**, click **Start your project**, sign in.
2. Click **New project**.
3. Fill in: **Name** → `tag-atlas`. **Database password** → click
   **Generate a password** and save it somewhere (a notes app is fine — the
   app itself never needs it). **Region** → closest to you.
4. Click **Create new project** and wait ~1 minute for it to provision.

### Turn on email sign-in

The app uses standard email + password auth (Supabase's default "Email"
provider), plus a confirmation email the first time someone signs up. This
provider is on by default, so you can skip this unless you want to double
check:

5. Left sidebar → **Authentication** → **Providers**.
6. Confirm **Email** is enabled (it should already be).

### Set your redirect URL (important — do this now and again after deploying)

7. Left sidebar → **Authentication** → **URL Configuration**.
8. Under **Site URL**, put `http://localhost:3000` for now.
9. Under **Redirect URLs**, add `http://localhost:3000/auth/callback`.
10. Click **Save**. (You'll come back here in Part 6 and add your Vercel URL too.)

### Create the database table + security rules

11. Left sidebar → **SQL Editor** → **New query**.
12. Open `sql/schema.sql` from this project folder, copy its entire contents,
    paste into the editor.
13. Click **Run** (or Ctrl/Cmd+Enter). You should see "Success. No rows returned."

**This one file is genuinely the only SQL you need to run.** It was checked
line-by-line against the code for this guide: every table (`projects`) and
every storage bucket (`project-files`) the app actually queries is covered
by this file's `create table` and its RLS/storage policies, and the file's
own git history shows it as the single consolidated result of every
migration this project has gone through — nothing was run against this
database afterward that isn't already reflected here. If you ever add a new
feature that touches the database (a new column, a new table), update this
file to match at the same time, so it never drifts out of sync with reality
again the way earlier drafts of it did.

This creates the `projects` table — including the `sections` jsonb column
that holds the structured Intro/What it is/Deliverables/Future
scope/Stability/Additional info/Week-by-week fields as one nested object, so
no separate column is needed per field — and locks the whole table down
with Row Level Security so each signed-in user can only ever see and edit
their own rows.

### Create the file storage bucket

14. Left sidebar → **Storage** → **New bucket**.
15. Name it exactly `project-files` (the code refers to this exact name).
16. Leave **Public bucket** turned **off** — keep it private. Click **Create bucket**.

The storage security policies for this bucket are already included at the
bottom of the same `sql/schema.sql` you ran in step 13, so nothing else is
needed here. (Bucket *creation* itself is a Storage-tab action, not SQL —
that's why it's a separate step from step 13 rather than part of the script.)

### Get your Supabase API keys

17. Left sidebar → **Project Settings** (gear icon) → **API**.
18. Copy the **Project URL** and the **anon public** key. Keep this tab open.

---

## Part 2 — Get a Gemini API key (5 minutes, free)

This powers the ✨ *Suggest tags with AI* button and the **Clean up tags**
merge feature.

1. Go to **https://aistudio.google.com**, sign in with any Google account.
2. Click **Get API key** → **Create API key**.
3. Copy the key. Keep this tab open too.

**About the free tier, checked directly against Google's current docs
rather than assumed:** as of mid-2026, Gemini's Flash-tier models
(including the `gemini-3.5-flash` model this project currently uses) remain
available with no credit card and no expiration on the free tier, rate-
limited for prototyping/personal-scale use — far more than tagging your own
projects will ever hit. Google has moved Pro-tier models to paid-only as of
earlier this year and has been actively shifting exact free-tier limits and
model availability, so if you ever hit an unexpected billing prompt or a
"model not available" error, check **https://ai.google.dev/gemini-api/docs/pricing**
for the current free-tier model list rather than assuming this doc is still
accurate — that page is the source of truth, this paragraph is a snapshot.

If you skip this step entirely, the rest of the app still works fine — the
AI buttons will just show an error saying tag suggestions aren't configured.
You can always come back and add the key later.

---

## Part 3 — Install on your computer (5 minutes)

1. Check Node.js is installed:
   ```bash
   node -v
   ```
   Need v18+? Install from **https://nodejs.org**, then continue.

2. Unzip the project folder wherever you keep projects.

3. Open a terminal inside the unzipped folder:
   ```bash
   cd path/to/tag-board
   ```

4. Install dependencies:
   ```bash
   npm install
   ```
   Ignore "funding" or "vulnerabilities" notices — informational, not errors.

---

## Part 4 — Connect your keys (2 minutes)

1. ```bash
   cp .env.local.example .env.local
   ```
2. Open `.env.local` in any text editor and fill in all three values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...(your long anon key from Part 1, step 18)
   GEMINI_API_KEY=your_gemini_key_from_part_2
   ```
3. Save. This file is already excluded from git via `.gitignore` — never
   commit it or share it publicly. The service-role key (if you ever use one
   for one-off scripts like `bulk-add-projects.mjs` or `get-user-id.mjs`) is
   even more sensitive than these three and should never go in this file or
   be committed either — pass it as a one-off environment variable on the
   command line instead.

---

## Part 5 — Run it locally (2 minutes)

1. ```bash
   npm run dev
   ```
2. Open **http://localhost:3000** — you'll land on the sign-in page.
3. Click **Create one** to switch to sign-up mode, type your email and a
   password (6+ characters), click **Create account**.
4. Check your inbox (check spam too, first time) for a confirmation email,
   click the link in it.
5. Back on the sign-in page, type the same email and password, click
   **Sign in**.
6. Click **+ New project**. Try all three ways of adding content:
   - Fill in the structured sections by hand (Intro, What it is,
     Deliverables, Future scope, Stability, Additional info, week-by-week
     goals), or
   - Click **Upload .md / .txt** and pick a single-project file — the
     sections fill in automatically, parsed straight from the file's text.
   - Upload a file containing **several** project write-ups bundled
     together — Tag Atlas detects the separate projects, splits them apart,
     and opens each as its own review card in a minimized dock at the
     bottom of the screen. Expand up to 3 at once, review, and save or
     discard each individually.
7. Add tags by typing and pressing Enter, or by clicking an existing tag
   suggestion shown below the input. Then try **✨ Suggest tags with AI** —
   it reads your write-up and suggests tags to add with one click. If it
   comes back saying your tags already look complete, that's the feature
   working correctly, not a bug — it only has something to suggest when
   there's actually a gap.
8. Open any project's detail view (the right-hand "Full content" pane) —
   click **Download .md** next to its title and it downloads instantly as a
   markdown file, regenerated from whatever's currently in its sections.
   Works for every project, hand-typed ones included.
9. Now open a project you created **via file upload** specifically, and
   scroll to the bottom of its detail view — you'll also see "Original
   file: yourfile.md" with a separate **download** link next to it. That
   one only appears for projects that had a file attached, and always
   downloads the exact original file, even if you've since edited the
   project's sections.
10. Click tag bubbles at the top of the board — watch the list re-rank live.
    Use the search box above the tag grid to filter them once you have more
    tags than fit on screen.
11. Try **edit**, **archive**, and **delete** on a card.
12. Once you have a handful of tags that might mean similar things, click
    **Clean up tags** in the sidebar (only appears once you have 2+ tags).
    It scans everything and shows any likely-duplicate clusters, with a
    radio choice for which tag becomes the canonical one, and a per-cluster
    **Merge** button — nothing merges until you click it.

If anything errors, copy the exact red text from the browser console or
terminal.

---

## Part 6 — Deploy to Vercel (10 minutes)

1. Push this folder to a new GitHub repo (create one at **github.com/new**,
   then follow the "push an existing repository from the command line"
   instructions GitHub shows you). Double-check with `git status` that
   nothing you need got left untracked — every file under `app/`,
   `components/`, `lib/`, and `sql/` should show as tracked before you push.
2. Go to **https://vercel.com**, sign in with GitHub.
3. Click **Add New → Project**, import your repo.
4. Before clicking Deploy, expand **Environment Variables** and add all three:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`

   (same values as your `.env.local`)
5. Click **Deploy**. Wait ~1 minute — you'll get a URL like
   `https://tag-atlas-xxxx.vercel.app`.

### Point Supabase at your live URL

This step is easy to miss and is the #1 reason logins work locally but fail
once deployed:

6. Back in Supabase → **Authentication** → **URL Configuration**.
7. Set **Site URL** to your real Vercel URL, e.g.
   `https://tag-atlas-xxxx.vercel.app`.
8. Under **Redirect URLs**, add `https://tag-atlas-xxxx.vercel.app/auth/callback`
   — keep the `localhost` one too, so local dev still works.
9. Click **Save**. Reload your live site and sign in again.

If you ever add a Gemini key *after* your first deploy, adding it in Vercel's
Environment Variables settings isn't enough by itself — trigger a redeploy
(Vercel → Deployments → ⋯ → Redeploy) so the new value is actually built in.

---

## What's in this folder

- `app/login/page.tsx` — email sign-in page.
- `app/auth/callback/route.ts` — handles the redirect after someone clicks
  the confirmation link in their sign-up email.
- `app/page.tsx` — server-side gatekeeper: sends you to `/login` if you're not
  signed in, otherwise loads your projects and hands them to the board.
- `app/board.tsx` — the whole interactive UI: tag bubbles, cards, detail
  view, sign-out, the draft dock for multi-project uploads, and the
  **Clean up tags** entry point.
- `app/api/suggest-tags/route.ts` — calls Gemini to suggest tags for a single
  project write-up.
- `app/api/cluster-tags/route.ts` — calls Gemini to find existing tags that
  likely mean the same thing, powering the tag-cleanup/merge feature.
- `components/ProjectForm.tsx` — the create/edit modal: structured sections,
  file upload, AI tag suggestions. Exports both the modal wrapper and the
  bare form body (`ProjectFormBody`), which `DraftDock` reuses so the two
  never drift out of sync.
- `components/DraftDock.tsx` — the minimized-drafts stack shown when a file
  upload contains multiple projects.
- `components/TagCleanup.tsx` — the "Clean up tags" modal: fetches AI-found
  tag clusters, lets you pick a canonical tag per cluster, and merges on
  confirm via `mergeTags()` in `board.tsx`.
- `components/TagInput.tsx` — the tag chip editor (reuse existing tags or add
  new ones) plus the AI suggestion chips.
- `components/TagGrid.tsx` / `components/PagedBubbleGrid.tsx` — the
  paginated, horizontally-scrolling tag bubble board with the search box.
- `components/ProjectCard.tsx` — a single project card in the sidebar list.
- `lib/sections.ts` — parsing/composing logic for the structured sections,
  including the multi-project bundle-splitting logic.
- `lib/gemini.ts` — shared Gemini client, server-side only. Check this file
  for the exact model string currently configured — it changes as Google's
  model lineup moves, and this doc doesn't try to hardcode a value that
  could go stale.
- `lib/ranking.ts` — the tag-matching scoring logic that ranks projects by
  how many selected tags they match.
- `lib/supabase/client.ts` / `server.ts` / `middleware.ts` — the Supabase
  connections (browser, server, and session-refresh) that Supabase's
  current auth pattern requires.
- `proxy.ts` — keeps your login session refreshed on every request (Next.js
  16's current name for what used to be `middleware.ts`).
- `sql/schema.sql` — everything you paste into the SQL Editor in Part 1; the
  single source of truth for the database structure, verified up to date
  against the actual code as of this revision. If you ever change the
  schema by hand in the Supabase dashboard, update this file to match in
  the same sitting — that's exactly the drift that caused build failures
  earlier in this project's history (a file existing locally but never
  committed, and dashboard-only schema changes that never made it into this
  file), so treat any dashboard-only change as unfinished until it's
  reflected here.

## Security model, in plain terms

- Row Level Security on the `projects` table means the database itself
  refuses to return or modify a row unless `auth.uid()` (the signed-in
  user making the request) matches that row's `user_id` — this holds even
  if someone bypassed the app UI entirely and queried Supabase directly.
- Storage policies apply the same rule to uploaded files, scoped by a
  per-user folder path.
- The Gemini API key and Supabase URL/anon key live in environment
  variables, never in committed code. The anon key is safe to expose to the
  browser by design (that's what "anon public" means) — it can't do
  anything RLS doesn't already allow. The Gemini key is used only in
  server-side API routes (`app/api/...`) and never reaches the browser.
- The `mergeTags` operation behind "Clean up tags" runs with the signed-in
  user's own normal permissions (not a service-role bypass), so it's still
  bound by the same RLS rules — it can only ever touch your own projects.
