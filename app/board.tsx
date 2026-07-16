"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { rankProjects } from "@/lib/ranking";
import type { Project } from "@/lib/types";
import ProjectCard from "@/components/ProjectCard";
import ProjectForm from "@/components/ProjectForm";

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
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [projects]);

  const ranked = useMemo(
    () => rankProjects(projects, selectedTags),
    [projects, selectedTags]
  );
  const activeProject = ranked.find((p) => p.id === activeId) ?? ranked[0] ?? null;

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    setProjects((data as Project[]) ?? []);
  }

  function toggleTag(tag: string) {
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

  async function selectProject(project: Project) {
    setActiveId(project.id);
    setDownloadUrl(null);

    if (project.file_path) {
      const supabase = createClient();
      const { data } = await supabase.storage
        .from("project-files")
        .createSignedUrl(project.file_path, 60);
      setDownloadUrl(data?.signedUrl ?? null);
    }
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
        <button className="button" type="button" onClick={openNew}>
          + New project
        </button>
        <button className="button ghost" type="button" onClick={signOut}>
          Sign out
        </button>
      </aside>

      <main className="main">
        <div className="bubbleWrap">
          {allTags.length === 0 ? (
            <p className="muted">No tags yet — add your first project to get started.</p>
          ) : null}
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`bubble ${selectedTags.includes(tag) ? "on" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="grid">
          {ranked.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              showScore={selectedTags.length > 0}
              selected={activeProject?.id === project.id}
              onSelect={() => selectProject(project)}
              onEdit={() => openEdit(project)}
              onDelete={() => handleDelete(project)}
            />
          ))}
        </div>

        <section className="detail">
          <h2>Full content</h2>
          {activeProject ? (
            <>
              <div className="rowSpace">
                <h3>{activeProject.title}</h3>
                <span className="muted small">
                  {new Date(activeProject.created_at).toLocaleString()}
                </span>
              </div>
              <div className="tags">
                {activeProject.tags.map((tag) => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
              <pre className="content">{activeProject.content}</pre>
              {activeProject.file_name ? (
                <p className="muted small">
                  Original file: {activeProject.file_name}{" "}
                  {downloadUrl ? (
                    <a href={downloadUrl} target="_blank" rel="noreferrer">
                      download
                    </a>
                  ) : null}
                </p>
              ) : null}
            </>
          ) : (
            <p className="muted">No project selected yet.</p>
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
