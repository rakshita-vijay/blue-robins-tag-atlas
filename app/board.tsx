"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rankProjects, scoreProject } from "@/lib/ranking";
import type { Project } from "@/lib/types";
import ProjectCard from "@/components/ProjectCard";
import ProjectForm from "@/components/ProjectForm";
import TagGrid from "@/components/TagGrid";

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
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
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

  const allTags = useMemo(() => {
    const set = new Set<string>();
    activeProjects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [activeProjects]);

  // Sidebar list: active projects, filtered/sorted by the selected tags.
  const ranked = useMemo(
    () => rankProjects(activeProjects, selectedTags),
    [activeProjects, selectedTags]
  );

  // Archive drawer: just newest-first, tags don't filter it.
  const rankedArchived = useMemo(
    () => rankProjects(archivedProjects, []),
    [archivedProjects]
  );

  // The detail pane is blank until either (a) someone clicks a project
  // card directly, or (b) selected tags "unearth" a top match. A manual
  // click always wins over tag-matching, and only the tag-matched case
  // shows a similarity score.
  const manualProject = activeId
    ? projects.find((p) => p.id === activeId) ?? null
    : null;
  const autoProject =
    !manualProject && selectedTags.length > 0 ? ranked[0] ?? null : null;
  const displayedProject = manualProject ?? autoProject;
  const showScoreInDetail = !manualProject && !!autoProject;
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
    setProjects((data as Project[]) ?? []);
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

  async function signOut() {
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
          <button className="button ghost" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>

        <div className="sidebarList">
          {ranked.length === 0 ? (
            <p className="muted small">
              {activeProjects.length === 0
                ? "No active projects — add one, or check your archive below."
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
            />
          ))}
        </div>

        <div className="archiveSection">
          <button
            type="button"
            className="archiveToggle"
            onClick={() => setArchiveOpen((open) => !open)}
          >
            <span className="chevron">{archiveOpen ? "\u203A" : "\u2304"}</span>
            Archive{archivedProjects.length > 0 ? ` (${archivedProjects.length})` : ""}
          </button>

          {archiveOpen ? (
            <div className="archiveList">
              {rankedArchived.length === 0 ? (
                <p className="muted small">No archived projects.</p>
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
                  />
                ))
              )}
            </div>
          ) : null}
        </div>
      </aside>

      <main className="main">
        <div className="tagBar">
          {allTags.length === 0 ? (
            <p className="muted">No tags yet — add your first project to get started.</p>
          ) : (
            <TagGrid tags={allTags} selectedTags={selectedTags} onToggle={toggleTag} />
          )}
        </div>

        <section className="detail">
          <h2>Full content</h2>
          {displayedProject ? (
            <>
              <div className="rowSpace">
                <h3>{displayedProject.title}</h3>
                <span className="muted small">
                  {new Date(displayedProject.created_at).toLocaleString()}
                </span>
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
        />
      ) : null}
    </div>
  );
}
