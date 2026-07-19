"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rankProjects, scoreProject } from "@/lib/ranking";
import { composeContent, emptySections } from "@/lib/sections";
import { createZip, uniqueFileName } from "@/lib/zip";
import type { Project } from "@/lib/types";
import type { ParsedProjectDraft } from "@/lib/sections";
import ProjectCard from "@/components/ProjectCard";
import ProjectForm from "@/components/ProjectForm";
import DraftDock, { type Draft } from "@/components/DraftDock";
import TagGrid from "@/components/TagGrid";
import TagCleanup from "@/components/TagCleanup";

// Fills in any keys missing from a project's `sections` object with empty
// strings. Needed because rows can exist whose `sections` predates a field
// that was added later (e.g. `bulk-add-projects.mjs` inserted projects
// before `additionalInfo` existed) — every render below assumes every key
// is at least an empty string, never undefined, so this runs once here
// instead of every read needing its own defensive check.
function normalizeProject(project: Project): Project {
  if (!project.sections) return project;
  const defaults = emptySections();
  return {
    ...project,
    sections: {
      ...defaults,
      ...project.sections,
      weeks:
        project.sections.weeks && project.sections.weeks.length > 0
          ? project.sections.weeks
          : defaults.weeks,
    },
  };
}

// Regenerates a project's full write-up as markdown text. Works for every
// project — hand-typed ones included — unlike the "Original file" download
// link below, which only exists for projects that started as a file
// upload and only ever reflects that original file's exact text.
function projectToMarkdown(project: Project): string {
  const body = project.sections ? composeContent(project.sections) : project.content;
  return `# ${project.title}\n\n${body}\n`;
}

function safeFileStem(title: string): string {
  return title.trim().replace(/[^a-zA-Z0-9._ -]/g, "") || "project";
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadProjectAsMarkdown(project: Project) {
  const markdown = projectToMarkdown(project);
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  triggerBlobDownload(blob, `${safeFileStem(project.title)}.md`);
}

// Bundles every project (active + archived) into one .zip of .md files,
// entirely client-side — no server round-trip, no storage bucket involved.
// Duplicate titles get " (2)", " (3)", etc. so nothing overwrites another
// file inside the zip.
async function downloadAllProjectsAsZip(projects: Project[]) {
  if (projects.length === 0) return;

  const used = new Set<string>();
  const entries = projects.map((project) => ({
    name: uniqueFileName(`${safeFileStem(project.title)}.md`, used),
    content: projectToMarkdown(project),
  }));

  const blob = await createZip(entries);
  const stamp = new Date().toISOString().slice(0, 10);
  triggerBlobDownload(blob, `tag-atlas-projects-${stamp}.zip`);
}

export default function Board({
  initialProjects,
  userEmail,
  userId,
}: {
  initialProjects: Project[];
  userEmail: string;
  userId: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(() =>
    initialProjects.map(normalizeProject)
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  const [downloadInfo, setDownloadInfo] = useState<{ id: number; url: string | null } | null>(
    null
  );

  const activeProjects = useMemo(
    () => projects.filter((p) => !p.archived),
    [projects]
  );
  const archivedProjects = useMemo(
    () => projects.filter((p) => p.archived),
    [projects]
  );
  // Bookmarks are independent of archive status — a project can be both
  // archived and bookmarked, so this "come back to" list stays reliable
  // even for things you've tucked away.
  const bookmarkedProjects = useMemo(
    () => projects.filter((p) => p.bookmarked),
    [projects]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    activeProjects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [activeProjects]);

  // Sidebar list: active projects, filtered/sorted by the selected tags,
  // then narrowed further by the name search box if anything's typed there.
  const ranked = useMemo(() => {
    const base = rankProjects(activeProjects, selectedTags);
    const q = projectSearch.trim().toLowerCase();
    return q ? base.filter((p) => p.title.toLowerCase().includes(q)) : base;
  }, [activeProjects, selectedTags, projectSearch]);

  // Archive drawer: just newest-first, tags don't filter it — but the name
  // search box does, same as the main list.
  const rankedArchived = useMemo(() => {
    const base = rankProjects(archivedProjects, []);
    const q = projectSearch.trim().toLowerCase();
    return q ? base.filter((p) => p.title.toLowerCase().includes(q)) : base;
  }, [archivedProjects, projectSearch]);

  // Bookmarks drawer: same pattern as the archive drawer — newest-first,
  // narrowed by the name search box only.
  const rankedBookmarks = useMemo(() => {
    const base = rankProjects(bookmarkedProjects, []);
    const q = projectSearch.trim().toLowerCase();
    return q ? base.filter((p) => p.title.toLowerCase().includes(q)) : base;
  }, [bookmarkedProjects, projectSearch]);

  // The detail pane is blank until either (a) someone clicks a project
  // card directly, or (b) selected tags "unearth" a top match. A manual
  // click always wins over tag-matching. The similarity score shows
  // whenever tags are selected, whether the project shown got there by
  // manual click or by tag-matching.
  const manualProject = activeId
    ? projects.find((p) => p.id === activeId) ?? null
    : null;
  const autoProject =
    !manualProject && selectedTags.length > 0 ? ranked[0] ?? null : null;
  const displayedProject = manualProject ?? autoProject;
  const showScoreInDetail = selectedTags.length > 0;
  const detailScore = displayedProject
    ? scoreProject(displayedProject, selectedTags)
    : null;

  useEffect(() => {
    if (!displayedProject?.file_path) return;

    let cancelled = false;
    const supabase = createClient();
    const projectId = displayedProject.id;
    supabase.storage
      .from("project-files")
      .createSignedUrl(displayedProject.file_path, 60)
      .then(({ data }) => {
        if (!cancelled) setDownloadInfo({ id: projectId, url: data?.signedUrl ?? null });
      });

    return () => {
      cancelled = true;
    };
  }, [displayedProject?.id, displayedProject?.file_path]);

  // Only trust the fetched signed URL if it belongs to the project that's
  // currently on screen — avoids showing a stale link while a new one loads.
  const downloadUrl =
    downloadInfo && downloadInfo.id === displayedProject?.id ? downloadInfo.url : null;

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    setProjects(((data as Project[]) ?? []).map(normalizeProject));
  }

  // Renames every occurrence of the tags in `tagsToMerge` to `canonical`
  // across every project that has any of them (active or archived), then
  // dedupes each project's tag list. Used by the "Clean up tags" modal —
  // nothing here runs until the user confirms a specific merge.
  async function mergeTags(tagsToMerge: string[], canonical: string) {
    const supabase = createClient();
    const affected = projects.filter((p) =>
      p.tags.some((t) => tagsToMerge.includes(t))
    );
    for (const p of affected) {
      const newTags = Array.from(
        new Set(p.tags.map((t) => (tagsToMerge.includes(t) ? canonical : t)))
      );
      await supabase.from("projects").update({ tags: newTags }).eq("id", p.id);
    }
    await refresh();
  }

  function toggleTag(tag: string) {
    setActiveId(null);
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function openNew() {
    setEditingProject(null);
    setFormOpen(true);
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setFormOpen(true);
  }

  async function handleArchive(project: Project) {
    const supabase = createClient();
    const { error } = await supabase
      .from("projects")
      .update({ archived: !project.archived })
      .eq("id", project.id);
    if (!error) {
      await refresh();
    }
  }

  async function handleToggleBookmark(project: Project) {
    const supabase = createClient();
    const { error } = await supabase
      .from("projects")
      .update({ bookmarked: !project.bookmarked })
      .eq("id", project.id);
    if (!error) {
      await refresh();
    }
  }

  async function handleDelete(project: Project) {
    const ok = window.confirm(`Delete "${project.title}"? This cannot be undone.`);
    if (!ok) return;

    const supabase = createClient();

    if (project.file_path) {
      await supabase.storage.from("project-files").remove([project.file_path]);
    }

    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (!error) {
      if (activeId === project.id) setActiveId(null);
      await refresh();
    }
  }

  async function handleSaved() {
    setFormOpen(false);
    setEditingProject(null);
    await refresh();
  }

  function handleMultipleProjectsDetected(
    parsed: ParsedProjectDraft[],
    sourceFileName: string
  ) {
    const newDrafts: Draft[] = parsed.map((draft, i) => ({
      ...draft,
      id: `draft-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      sourceFileName,
    }));
    setDrafts((prev) => [...prev, ...newDrafts]);
  }

  function discardDraft(draftId: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
  }

  function discardAllDrafts() {
    setDrafts([]);
  }

  async function handleDraftSaved(draftId: string) {
    discardDraft(draftId);
    await refresh();
  }

  async function signOut() {
    const ok = window.confirm("Sign out?");
    if (!ok) return;

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function selectProject(project: Project) {
    setActiveId((current) => (current === project.id ? null : project.id));
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>Tag Atlas</h1>
        <p className="muted">
          Store your project write-ups once. Click the tags that matter and
          find them again instantly.
        </p>
        <p className="muted small">Signed in as {userEmail}</p>

        <div className="rowGap sidebarTopActions">
          <button className="button" type="button" onClick={openNew}>
            + New project
          </button>
        </div>

        {allTags.length > 1 ? (
          <button
            className="button ghost"
            type="button"
            style={{ marginTop: 8, width: "100%" }}
            onClick={() => setCleanupOpen(true)}
          >
            Clean up tags
          </button>
        ) : null}

        <input
          type="text"
          className="projectSearchInput"
          placeholder="Find a project by name…"
          value={projectSearch}
          onChange={(e) => setProjectSearch(e.target.value)}
        />

        <div className="sidebarList">
          {ranked.length === 0 ? (
            <p className="muted small">
              {activeProjects.length === 0
                ? "No active projects — add one, or check your archive below."
                : projectSearch.trim()
                ? `No projects match "${projectSearch.trim()}".`
                : "No projects match the selected tags."}
            </p>
          ) : null}

          {ranked.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              showScore={selectedTags.length > 0}
              selected={displayedProject?.id === project.id}
              onSelect={() => selectProject(project)}
              onEdit={() => openEdit(project)}
              onArchive={() => handleArchive(project)}
              onDelete={() => handleDelete(project)}
              onToggleBookmark={() => handleToggleBookmark(project)}
            />
          ))}
        </div>

        <div className="bookmarksSection">
          <button
            type="button"
            className="bookmarksToggle"
            onClick={() => setBookmarksOpen((open) => !open)}
          >
            <span className="chevron">{bookmarksOpen ? "\u203A" : "\u2304"}</span>
            <span className="toggleLabel">
              Bookmarks{bookmarkedProjects.length > 0 ? ` (${bookmarkedProjects.length})` : ""}
            </span>
          </button>

          {bookmarksOpen ? (
            <div className="bookmarksList">
              {rankedBookmarks.length === 0 ? (
                <p className="muted small">
                  {bookmarkedProjects.length === 0
                    ? "No bookmarks yet — tap the star on a project to save it here."
                    : `No bookmarks match "${projectSearch.trim()}".`}
                </p>
              ) : (
                rankedBookmarks.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    showScore={false}
                    selected={displayedProject?.id === project.id}
                    onSelect={() => selectProject(project)}
                    onEdit={() => openEdit(project)}
                    onArchive={() => handleArchive(project)}
                    onDelete={() => handleDelete(project)}
                    onToggleBookmark={() => handleToggleBookmark(project)}
                  />
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="archiveSection">
          <button
            type="button"
            className="archiveToggle"
            onClick={() => setArchiveOpen((open) => !open)}
          >
            <span className="chevron">{archiveOpen ? "\u203A" : "\u2304"}</span>
            <span className="toggleLabel">
              Archive{archivedProjects.length > 0 ? ` (${archivedProjects.length})` : ""}
            </span>
          </button>

          {archiveOpen ? (
            <div className="archiveList">
              {rankedArchived.length === 0 ? (
                <p className="muted small">
                  {archivedProjects.length === 0
                    ? "No archived projects."
                    : `No archived projects match "${projectSearch.trim()}".`}
                </p>
              ) : (
                rankedArchived.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    showScore={false}
                    selected={displayedProject?.id === project.id}
                    onSelect={() => selectProject(project)}
                    onEdit={() => openEdit(project)}
                    onArchive={() => handleArchive(project)}
                    onDelete={() => handleDelete(project)}
                    onToggleBookmark={() => handleToggleBookmark(project)}
                  />
                ))
              )}
            </div>
          ) : null}
        </div>

        <button
          className="button ghost"
          type="button"
          style={{ marginTop: 12, width: "100%" }}
          onClick={() => downloadAllProjectsAsZip(projects)}
          disabled={projects.length === 0}
        >
          Download all as .zip
        </button>

        <button
          className="button ghost"
          type="button"
          style={{ marginTop: 8, width: "100%" }}
          onClick={signOut}
        >
          Sign out
        </button>
      </aside>

      <main className="main">
        <div className="tagBar">
          {allTags.length === 0 ? (
            <p className="muted">No tags yet — add your first project to get started.</p>
          ) : (
            <>
              {selectedTags.length > 0 ? (
                <div className="rowSpace tagBarHeader">
                  <span className="muted small">
                    {selectedTags.length} tag{selectedTags.length === 1 ? "" : "s"} selected
                  </span>
                  <button
                    type="button"
                    className="button ghost small"
                    onClick={() => setSelectedTags([])}
                  >
                    Clear selected tags
                  </button>
                </div>
              ) : null}
              <TagGrid tags={allTags} selectedTags={selectedTags} onToggle={toggleTag} />
            </>
          )}
        </div>

        <section className="detail">
          <h2>Full content</h2>
          {displayedProject ? (
            <>
              <div className="rowSpace">
                <h3>{displayedProject.title}</h3>
                <div className="detailHeaderActions">
                  <span className="muted small">
                    {new Date(displayedProject.created_at).toLocaleString()}
                  </span>
                  <button
                    type="button"
                    className="button ghost small"
                    onClick={() => downloadProjectAsMarkdown(displayedProject)}
                  >
                    Download .md
                  </button>
                </div>
              </div>

              {showScoreInDetail && detailScore ? (
                <div className="scoreRow">
                  <span className="score">
                    {detailScore.score} match{detailScore.score === 1 ? "" : "es"}
                  </span>
                  <span className="score">{detailScore.percentage}% similarity</span>
                </div>
              ) : null}

              <div className="tags">
                {[...displayedProject.tags]
                  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
                  .map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>

              {displayedProject.sections ? (
                <div className="sections">
                  {displayedProject.sections.intro.trim() ? (
                    <div className="sectionBlockView">
                      <h4>Intro / why this project</h4>
                      <pre className="content">{displayedProject.sections.intro}</pre>
                    </div>
                  ) : null}
                  {displayedProject.sections.whatItIs.trim() ? (
                    <div className="sectionBlockView">
                      <h4>What it is</h4>
                      <pre className="content">{displayedProject.sections.whatItIs}</pre>
                    </div>
                  ) : null}
                  {displayedProject.sections.deliverables.trim() ? (
                    <div className="sectionBlockView">
                      <h4>Exact end deliverables</h4>
                      <pre className="content">{displayedProject.sections.deliverables}</pre>
                    </div>
                  ) : null}
                  {displayedProject.sections.futureScope.trim() ? (
                    <div className="sectionBlockView">
                      <h4>Future scope</h4>
                      <pre className="content">{displayedProject.sections.futureScope}</pre>
                    </div>
                  ) : null}
                  {displayedProject.sections.stability.trim() ? (
                    <div className="sectionBlockView">
                      <h4>Stability</h4>
                      <pre className="content">{displayedProject.sections.stability}</pre>
                    </div>
                  ) : null}
                  {displayedProject.sections.weeks.some((w) => w.trim()) ? (
                    <div className="sectionBlockView">
                      <h4>Week-wise goals</h4>
                      <div className="weekViewList">
                        {displayedProject.sections.weeks.map((goals, i) =>
                          goals.trim() ? (
                            <div className="weekViewItem" key={i}>
                              <span className="score small weekBadge">Week {i + 1}</span>
                              <pre className="content">{goals}</pre>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  ) : null}
                  {displayedProject.sections.additionalInfo.trim() ? (
                    <div className="sectionBlockView">
                      <h4>Any additional info</h4>
                      <pre className="content">{displayedProject.sections.additionalInfo}</pre>
                    </div>
                  ) : null}
                </div>
              ) : (
                <pre className="content">{displayedProject.content}</pre>
              )}
              {displayedProject.file_name ? (
                <p className="muted small">
                  Original file: {displayedProject.file_name}{" "}
                  {downloadUrl ? (
                    <a href={downloadUrl} target="_blank" rel="noreferrer">
                      download
                    </a>
                  ) : null}
                </p>
              ) : null}
            </>
          ) : (
            <div className="emptyDetail">
              <p className="muted">Choose a project, or click tags to find a match.</p>
            </div>
          )}
        </section>
      </main>

      {formOpen ? (
        <ProjectForm
          project={editingProject}
          allTags={allTags}
          userId={userId}
          onClose={() => setFormOpen(false)}
          onSaved={handleSaved}
          onMultipleProjectsDetected={handleMultipleProjectsDetected}
          dockActive={drafts.length > 0}
        />
      ) : null}

      {cleanupOpen ? (
        <TagCleanup
          allTags={allTags}
          onMerge={mergeTags}
          onClose={() => setCleanupOpen(false)}
        />
      ) : null}

      <DraftDock
        drafts={drafts}
        allTags={allTags}
        userId={userId}
        onSaved={handleDraftSaved}
        onDiscard={discardDraft}
        onDiscardAll={discardAllDrafts}
      />
    </div>
  );
}
