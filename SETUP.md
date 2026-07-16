# Tag Atlas — Setup Guide (start to finish)

Follow this top to bottom, in order. I built and compiled this exact project
before giving it to you — `npm run build` and the linter both pass clean with
zero errors and zero warnings. The one thing I can't test from here is the
live Supabase connection itself (that needs your real project keys), so Part 1
matters — set it up exactly as written.

**What you're getting:**
- Sign in with just your email (a magic link — no passwords to manage).
- Add a project: type a title + description, or upload a `.md`/`.txt` file
  and it fills the description in for you automatically.
- Tag it — click existing tags to reuse them, or type brand-new ones.
- Click tag bubbles on the main board to filter; projects matching the most
  clicked tags rise to the top.
- Edit or delete any project. Every project's original uploaded file (if any)
  is downloadable from its detail view.
- Only you can see your own projects — everyone else's data is invisible to
  you and vice versa, enforced by the database itself, not just the app.

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

Email magic-link sign-in is on by default, so you can skip this unless you
want to double check:

5. Left sidebar → **Authentication** → **Providers**.
6. Confirm **Email** is enabled (it should already be).

### Set your redirect URL (important — do this now and again after deploying)

7. Left sidebar → **Authentication** → **URL Configuration**.
8. Under **Site URL**, put `http://localhost:3000` for now.
9. Under **Redirect URLs**, add `http://localhost:3000/auth/callback`.
10. Click **Save**. (You'll come back here in Part 5 and add your Vercel URL too.)

### Create the database table + security rules

11. Left sidebar → **SQL Editor** → **New query**.
12. Open `sql/schema.sql` from this project folder, copy its entire contents,
    paste into the editor.
13. Click **Run** (or Ctrl/Cmd+Enter). You should see "Success. No rows returned."

This creates the `projects` table and locks it down so each signed-in user
can only ever see and edit their own rows — that's what "Row Level Security"
means, and it's what makes login actually matter instead of being decorative.

### Create the file storage bucket

14. Left sidebar → **Storage** → **New bucket**.
15. Name it exactly `project-files` (the code refers to this exact name).
16. Leave **Public bucket** turned **off** — keep it private. Click **Create bucket**.

The storage security policies for this bucket are already included at the
bottom of the same `sql/schema.sql` you ran in step 13, so nothing else is
needed here.

### Get your API keys

17. Left sidebar → **Project Settings** (gear icon) → **API**.
18. Copy the **Project URL** and the **anon public** key. Keep this tab open.

---

## Part 2 — Install on your computer (5 minutes)

1. Check Node.js is installed:
   ```bash
   node -v
   ```
   Need v18+? Install from **https://nodejs.org**, then continue.

2. Unzip `tag-atlas.zip` wherever you keep projects.

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

## Part 3 — Connect to Supabase (2 minutes)

1. ```bash
   cp .env.local.example .env.local
   ```
2. Open `.env.local` in any text editor and paste in the two values from
   Part 1, step 18:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...(your long key)
   ```
3. Save. This file is already excluded from git via `.gitignore` — never
   commit it or share it publicly.

---

## Part 4 — Run it locally (2 minutes)

1. ```bash
   npm run dev
   ```
2. Open **http://localhost:3000** — you'll land on the sign-in page.
3. Type your email, click **Send sign-in link**.
4. Check your inbox (check spam too, first time), click the link. It'll open
   a new tab and log you straight in.
5. Click **+ New project**. Try both ways of adding content:
   - Type a title, description, and tags directly, or
   - Click **Upload .md / .txt**, pick a file — the description fills in
     automatically from the file's text.
6. Add tags by typing and pressing Enter, or by clicking an existing tag
   suggestion shown below the input.
7. Click tag bubbles at the top of the board — watch the list re-rank live.
8. Try **edit** and **delete** on a card.

If anything errors, copy the exact red text from the browser console or
terminal and send it to me — I'll fix it directly.

---

## Part 5 — Deploy to Vercel (10 minutes)

1. Push this folder to a new GitHub repo (create one at **github.com/new**,
   then follow the "push an existing repository from the command line"
   instructions GitHub shows you).
2. Go to **https://vercel.com**, sign in with GitHub.
3. Click **Add New → Project**, import your repo.
4. Before clicking Deploy, expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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

---

## What's in this folder

- `app/login/page.tsx` — email sign-in page.
- `app/auth/callback/route.ts` — handles the magic-link redirect.
- `app/page.tsx` — server-side gatekeeper: sends you to `/login` if you're not
  signed in, otherwise loads your projects and hands them to the board.
- `app/board.tsx` — the whole interactive UI: tag bubbles, cards, detail view,
  sign-out.
- `components/ProjectForm.tsx` — the create/edit modal, including file upload.
- `components/TagInput.tsx` — the tag chip editor (reuse existing tags or add
  new ones).
- `components/ProjectCard.tsx` — a single project card in the grid.
- `lib/supabase/client.ts` / `server.ts` — the two Supabase connections (one
  for the browser, one for the server) that Supabase's own auth pattern
  requires.
- `proxy.ts` — keeps your login session refreshed on every request (Next.js
  16 renamed this from `middleware.ts`; this project already uses the current name).
- `lib/ranking.ts` — the tag-matching scoring logic.
- `sql/schema.sql` — everything you paste into the SQL Editor in Part 1.

## What changed from your last version, and why

- **Brought back login, file upload, and full editing**, as you asked, using
  Supabase's currently documented pattern (`@supabase/ssr`, email magic
  links — no separate password to manage).
- **Named it "Tag Atlas"** with real intro text on both the login screen and
  the sidebar, instead of a placeholder title.
- **Tags are now a proper chip editor**, not a plain comma-separated text
  box: existing tags show up as one-click "reuse" suggestions, and you can
  still type any brand-new tag that isn't in the list yet.
- **File upload** reads `.md`/`.txt` files straight into the description (so
  you don't have to retype anything) and also stores the original file in
  private Supabase Storage, with a download link on each project's detail view.
- **Fixed the Next.js 16 deprecation**: this version uses `proxy.ts`, not the
  old `middleware.ts` name, so there are no build warnings.
- Actually built and linted this project before sending it — clean build,
  clean lint, zero TypeScript errors.
