-- Run this in Supabase's SQL Editor on your EXISTING project.
-- Adds one column with a default, so every existing project becomes
-- un-bookmarked automatically — nothing else changes, nothing is deleted.

alter table projects
  add column if not exists bookmarked boolean not null default false;

-- No RLS changes needed: the existing row-level policies on `projects`
-- already cover every column, including this new one.
