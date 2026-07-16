"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectSections } from "@/lib/types";
import TagInput from "./TagInput";

const ACCEPTED_EXTENSIONS = [".md", ".txt"];
const MIN_WEEKS = 1;
const MAX_WEEKS = 52;

function emptySections(): ProjectSections {
  return {
    intro: "",
    whatItIs: "",
    deliverables: "",
    futureScope: "",
    stability: "",
    weeks: [""],
  };
}

// Turns the structured sections into one plain-text blob. This is what gets
// saved in `content` (kept around for the DB's not-null column, downloads,
// etc.) whenever the user fills in the fields by hand instead of uploading
// a file.
function composeContent(sections: ProjectSections): string {
  const parts: string[] = [];

  if (sections.intro.trim()) {
    parts.push(`Intro / why this project:\n${sections.intro.trim()}`);
  }
  if (sections.whatItIs.trim()) {
    parts.push(`What it is:\n${sections.whatItIs.trim()}`);
  }
  if (sections.deliverables.trim()) {
    parts.push(`Exact end deliverables:\n${sections.deliverables.trim()}`);
  }
  if (sections.futureScope.trim()) {
    parts.push(`Future scope:\n${sections.futureScope.trim()}`);
  }
  if (sections.stability.trim()) {
    parts.push(`Stability:\n${sections.stability.trim()}`);
  }

  const nonEmptyWeeks = sections.weeks
    .map((goals, i) => ({ week: i + 1, goals: goals.trim() }))
    .filter((w) => w.goals.length > 0);

  if (nonEmptyWeeks.length > 0) {
    const weekText = nonEmptyWeeks
      .map((w) => `Week ${w.week}: ${w.goals}`)
      .join("\n\n");
    parts.push(`Week-wise goals:\n${weekText}`);
  }

  return parts.join("\n\n");
}

function sectionsAreEmpty(sections: ProjectSections): boolean {
  return composeContent(sections).trim().length === 0;
}

export default function ProjectForm({
  project,
  allTags,
  userId,
  onClose,
  onSaved,
}: {
  project: Project | null;
  allTags: string[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(project?.title ?? "");
  const [sections, setSections] = useState<ProjectSections>(() => {
    if (project?.sections) return project.sections;
    // Older projects saved before this structured form existed only have a
    // flat `content` string — carry it into Intro so nothing is lost, and
    // the user can redistribute it into the other fields if they want.
    if (project?.content) {
      return { ...emptySections(), intro: project.content };
    }
    return emptySections();
  });
  const [tags, setTags] = useState<string[]>(project?.tags ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(project?.file_name ?? null);
  const [fileRawContent, setFileRawContent] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLegacyOnly = !project?.sections && !!project?.content && !file;

  function updateSection<K extends keyof Omit<ProjectSections, "weeks">>(
    key: K,
    value: string
  ) {
    setSections((prev) => ({ ...prev, [key]: value }));
  }

  function updateWeek(index: number, value: string) {
    setSections((prev) => {
      const weeks = [...prev.weeks];
      weeks[index] = value;
      return { ...prev, weeks };
    });
  }

  function setWeekCount(count: number) {
    const clamped = Math.max(MIN_WEEKS, Math.min(MAX_WEEKS, count));
    setSections((prev) => {
      const weeks = [...prev.weeks];
      while (weeks.length < clamped) weeks.push("");
      weeks.length = clamped;
      return { ...prev, weeks };
    });
  }

  function removeWeekAt(index: number) {
    setSections((prev) => {
      if (prev.weeks.length <= MIN_WEEKS) return prev;
      const weeks = prev.weeks.filter((_, i) => i !== index);
      return { ...prev, weeks };
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const isAllowed = ACCEPTED_EXTENSIONS.some((ext) =>
      selected.name.toLowerCase().endsWith(ext)
    );
    if (!isAllowed) {
      setErrorMsg("Only .md and .txt files are supported.");
      return;
    }

    setErrorMsg(null);
    setFile(selected);
    setFileName(selected.name);

    const reader = new FileReader();
    reader.onload = () => {
      setFileRawContent(String(reader.result ?? ""));
      if (!title.trim()) {
        setTitle(selected.name.replace(/\.(md|txt)$/i, ""));
      }
    };
    reader.readAsText(selected);
  }

  function clearFile() {
    setFile(null);
    setFileRawContent(null);
    setFileName(project?.file_name ?? null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || tags.length === 0) {
      setErrorMsg("Please add a title and at least one tag.");
      return;
    }

    // Uploading a file replaces the structured write-up with the file's raw
    // text, same as before — it's an alternative to filling in the fields.
    const usingRawFile = !!file;
    if (!usingRawFile && sectionsAreEmpty(sections)) {
      setErrorMsg(
        "Please fill in at least one section below, or upload a .md/.txt file."
      );
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    const supabase = createClient();

    let filePath = project?.file_path ?? null;
    let savedFileName = project?.file_name ?? null;

    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${userId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("project-files")
        .upload(path, file, { upsert: false });

      if (uploadError) {
        setErrorMsg(`File upload failed: ${uploadError.message}`);
        setSaving(false);
        return;
      }
      filePath = path;
      savedFileName = file.name;
    }

    const payload = {
      title: title.trim(),
      content: usingRawFile ? fileRawContent ?? "" : composeContent(sections),
      sections: usingRawFile ? null : sections,
      tags,
      file_name: savedFileName,
      file_path: filePath,
    };

    const { error } = project
      ? await supabase.from("projects").update(payload).eq("id", project.id)
      : await supabase.from("projects").insert({ ...payload, user_id: userId });

    setSaving(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    onSaved();
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modalCard formModalCard" onClick={(e) => e.stopPropagation()}>
        <div className="rowSpace">
          <h3>{project ? "Edit project" : "New project"}</h3>
          <button className="button ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <input
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="fileRow">
            <label className="button ghost fileLabel">
              Upload .md / .txt
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.txt,text/markdown,text/plain"
                onChange={handleFileChange}
                hidden
              />
            </label>
            {fileName ? (
              <span className="muted small">
                {fileName}{" "}
                {file ? (
                  <span className="linkish danger" onClick={clearFile}>
                    remove
                  </span>
                ) : null}
              </span>
            ) : (
              <span className="muted small">or fill in the sections below</span>
            )}
          </div>

          {file ? (
            <p className="muted small">
              A file is attached — its text will be saved as the project content
              instead of the sections below.
            </p>
          ) : (
            <>
              {isLegacyOnly ? (
                <p className="muted small">
                  This project predates the structured sections — its original
                  content was copied into &quot;Intro&quot; below. Feel free to
                  move it into the other fields.
                </p>
              ) : null}

              <div className="sectionBlock">
                <label className="muted small">Intro / why this project</label>
                <textarea
                  className="sectionArea"
                  placeholder="Why does this project exist? What problem or motivation started it?"
                  value={sections.intro}
                  onChange={(e) => updateSection("intro", e.target.value)}
                />
              </div>

              <div className="sectionBlock">
                <label className="muted small">What it is</label>
                <textarea
                  className="sectionArea"
                  placeholder="A short description of what this project actually is."
                  value={sections.whatItIs}
                  onChange={(e) => updateSection("whatItIs", e.target.value)}
                />
              </div>

              <div className="sectionBlock">
                <label className="muted small">Exact end deliverables</label>
                <textarea
                  className="sectionArea"
                  placeholder="Exactly what will exist when this is done."
                  value={sections.deliverables}
                  onChange={(e) => updateSection("deliverables", e.target.value)}
                />
              </div>

              <div className="sectionBlock">
                <label className="muted small">Future scope</label>
                <textarea
                  className="sectionArea"
                  placeholder="What could be added or extended later."
                  value={sections.futureScope}
                  onChange={(e) => updateSection("futureScope", e.target.value)}
                />
              </div>

              <div className="sectionBlock">
                <label className="muted small">Stability</label>
                <textarea
                  className="sectionArea"
                  placeholder="How stable / production-ready is this right now."
                  value={sections.stability}
                  onChange={(e) => updateSection("stability", e.target.value)}
                />
              </div>

              <div className="sectionBlock">
                <div className="rowSpace">
                  <label className="muted small">Week-wise goals</label>
                  <div className="weekStepper">
                    <button
                      type="button"
                      className="button ghost stepperBtn"
                      onClick={() => setWeekCount(sections.weeks.length - 1)}
                      disabled={sections.weeks.length <= MIN_WEEKS}
                    >
                      −
                    </button>
                    <span className="muted small weekCount">
                      {sections.weeks.length} week
                      {sections.weeks.length === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      className="button ghost stepperBtn"
                      onClick={() => setWeekCount(sections.weeks.length + 1)}
                      disabled={sections.weeks.length >= MAX_WEEKS}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="weekList">
                  {sections.weeks.map((goals, i) => (
                    <div className="weekItem" key={i}>
                      <div className="rowSpace">
                        <label className="muted small">Week {i + 1}</label>
                        {sections.weeks.length > MIN_WEEKS ? (
                          <span
                            className="linkish danger small"
                            onClick={() => removeWeekAt(i)}
                          >
                            remove
                          </span>
                        ) : null}
                      </div>
                      <textarea
                        className="sectionArea weekArea"
                        placeholder={`Goals for week ${i + 1}`}
                        value={goals}
                        onChange={(e) => updateWeek(i, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <label className="muted small">Tags</label>
          <TagInput tags={tags} onChange={setTags} suggestions={allTags} />

          {errorMsg ? <p className="errorMsg">{errorMsg}</p> : null}

          <button className="button" type="submit" disabled={saving}>
            {saving ? "Saving…" : project ? "Save changes" : "Create project"}
          </button>
        </form>
      </div>
    </div>
  );
}
